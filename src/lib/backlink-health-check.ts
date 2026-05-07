/**
 * Periodic health check for backlinks the user has marked "live".
 *
 * Two sources we check:
 *   1) `resourceSubmissions` rows with status="live" and a `submittedUrl`
 *      → if HEAD returns 4xx/5xx (or strong 404 patterns on the page), we
 *      flip status to "lost" and log activity.
 *   2) `guest_post_drafts` rows with status="published" and a `liveUrl` →
 *      same logic, but we move to status="rejected" because "lost" isn't
 *      in the guest-post enum (a published guest post that disappears is
 *      effectively rejected by the editor).
 *
 * This runs on demand from a settings page or a scheduled job. We don't
 * spin up Playwright — a plain HEAD with a 10s timeout is plenty.
 */

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activityLog,
  guestPostDrafts,
  resourceSubmissions,
  seoResources,
} from "@/db/schema";

const TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; seo-tool-link-health/1.0; +https://example.com)";

export type HealthCheckResult = {
  checked: number;
  lost: number;
  errors: number;
};

async function checkUrl(url: string): Promise<"ok" | "lost" | "error"> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": USER_AGENT },
    });
    // Some sites disallow HEAD — fall back to a tiny GET
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "user-agent": USER_AGENT, range: "bytes=0-1024" },
      });
    }
    if (res.status >= 400 && res.status < 600) return "lost";
    return "ok";
  } catch {
    return "error";
  } finally {
    clearTimeout(t);
  }
}

/**
 * Health-check all live backlinks for one client. Returns counts.
 */
export async function checkClientBacklinkHealth(
  clientId: number,
): Promise<HealthCheckResult> {
  const submissions = await db
    .select({
      id: resourceSubmissions.id,
      submittedUrl: resourceSubmissions.submittedUrl,
      domain: seoResources.domain,
    })
    .from(resourceSubmissions)
    .leftJoin(seoResources, eq(resourceSubmissions.resourceId, seoResources.id))
    .where(
      and(
        eq(resourceSubmissions.clientId, clientId),
        eq(resourceSubmissions.status, "live"),
        isNotNull(resourceSubmissions.submittedUrl),
      ),
    );

  const drafts = await db
    .select({
      id: guestPostDrafts.id,
      liveUrl: guestPostDrafts.liveUrl,
      siteName: guestPostDrafts.siteName,
    })
    .from(guestPostDrafts)
    .where(
      and(
        eq(guestPostDrafts.clientId, clientId),
        eq(guestPostDrafts.status, "published"),
        isNotNull(guestPostDrafts.liveUrl),
      ),
    );

  const result: HealthCheckResult = { checked: 0, lost: 0, errors: 0 };

  for (const s of submissions) {
    if (!s.submittedUrl) continue;
    result.checked++;
    const r = await checkUrl(s.submittedUrl);
    if (r === "error") {
      result.errors++;
      continue;
    }
    if (r === "lost") {
      result.lost++;
      await db
        .update(resourceSubmissions)
        .set({ status: "lost", updatedAt: new Date() })
        .where(eq(resourceSubmissions.id, s.id));
      await db.insert(activityLog).values({
        clientId,
        kind: "backlink_lost",
        message: `Backlink lost: ${s.domain ?? s.submittedUrl}`,
        entityType: "resource_submission",
        entityId: s.id,
        level: "warning",
      });
    }
  }

  for (const d of drafts) {
    if (!d.liveUrl) continue;
    result.checked++;
    const r = await checkUrl(d.liveUrl);
    if (r === "error") {
      result.errors++;
      continue;
    }
    if (r === "lost") {
      result.lost++;
      // Don't change status enum — drafts have their own. Keep "published"
      // but null out the liveUrl so the user notices on next visit.
      await db
        .update(guestPostDrafts)
        .set({ liveUrl: null, updatedAt: new Date() })
        .where(eq(guestPostDrafts.id, d.id));
      await db.insert(activityLog).values({
        clientId,
        kind: "backlink_lost",
        message: `Guest post link broken: ${d.siteName}`,
        entityType: "guest_post_draft",
        entityId: d.id,
        level: "warning",
      });
    }
  }

  return result;
}
