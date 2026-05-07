"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  clients,
  resourceSubmissions,
  seoResources,
} from "@/db/schema";
import {
  aiBespokeBacklinkIdeas,
  type AiBacklinkIdea,
} from "@/lib/backlink-niche-matcher";
import {
  checkClientBacklinkHealth,
  type HealthCheckResult,
} from "@/lib/backlink-health-check";

export type IdeasState =
  | { ok: true; ideas: AiBacklinkIdea[] }
  | { ok: false; error: string }
  | null;

/**
 * Generate AI-tuned bespoke prospects for a client. Pure suggestion — does
 * not insert anything. The user picks which to track via `trackBespokeIdea`.
 */
export async function fetchBespokeIdeas(
  _prev: IdeasState,
  formData: FormData,
): Promise<IdeasState> {
  const clientId = Number(formData.get("clientId"));
  if (!Number.isFinite(clientId) || clientId <= 0)
    return { ok: false, error: "Bad client id." };

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Client not found." };

  try {
    const ideas = await aiBespokeBacklinkIdeas(
      {
        niche: client.niche,
        city: client.city,
        country: client.country,
        businessType: client.businessType,
        description: client.description,
      },
      client.name,
    );
    if (ideas.length === 0)
      return {
        ok: false,
        error:
          "No AI bespoke ideas generated — check that an AI provider is configured in Settings.",
      };
    return { ok: true, ideas };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "AI call failed.",
    };
  }
}

/**
 * Track an AI-suggested bespoke prospect. We materialize it into seoResources
 * (so it shows in the global DB) and then create a submission row for this
 * client.
 */
export async function trackBespokeIdea(
  clientId: number,
  idea: AiBacklinkIdea,
) {
  if (!Number.isFinite(clientId) || clientId <= 0) return;
  let domain = "";
  try {
    domain = new URL(idea.url).hostname.replace(/^www\./, "");
  } catch {
    return;
  }
  if (!domain) return;

  // Check if a resource for this URL already exists
  const [existing] = await db
    .select({ id: seoResources.id })
    .from(seoResources)
    .where(eq(seoResources.url, idea.url))
    .limit(1);

  let resourceId: number;
  if (existing) {
    resourceId = existing.id;
  } else {
    const inserted = await db
      .insert(seoResources)
      .values({
        category: aiTypeToCategory(idea.type),
        url: idea.url,
        domain,
        da: null,
        alexa: null,
        notes: idea.rationale.slice(0, 500),
      })
      .returning({ id: seoResources.id });
    resourceId = inserted[0].id;
  }

  // Create submission if not already tracked for this client
  const [sub] = await db
    .select({ id: resourceSubmissions.id })
    .from(resourceSubmissions)
    .where(
      and(
        eq(resourceSubmissions.resourceId, resourceId),
        eq(resourceSubmissions.clientId, clientId),
      ),
    )
    .limit(1);
  if (!sub) {
    await db.insert(resourceSubmissions).values({
      resourceId,
      clientId,
      status: "pending",
      notes: idea.actionStep || null,
    });
  }
  revalidatePath(`/link-building/c/${clientId}`);
}

function aiTypeToCategory(t: AiBacklinkIdea["type"]): string {
  if (t === "directory") return "directory-submission";
  if (t === "podcast") return "blog-submission";
  if (t === "community" || t === "forum") return "forum-posting";
  if (t === "newsletter") return "blog-submission";
  if (t === "association") return "business-networking";
  if (t === "review_site") return "directory-submission";
  if (t === "tool_marketplace" || t === "course_marketplace") return "showcase";
  return "blog-submission";
}

/**
 * Bulk-track multiple curated seoResources in one click. Used by the "track
 * all easy wins" / "track all niche-fit" buttons.
 */
export async function bulkTrackResources(
  clientId: number,
  resourceIds: number[],
) {
  if (!Number.isFinite(clientId) || clientId <= 0) return;
  if (resourceIds.length === 0) return;

  const existing = await db
    .select({ resourceId: resourceSubmissions.resourceId })
    .from(resourceSubmissions)
    .where(eq(resourceSubmissions.clientId, clientId));
  const tracked = new Set(existing.map((e) => e.resourceId));

  const fresh = resourceIds.filter((id) => !tracked.has(id));
  if (fresh.length === 0) {
    revalidatePath(`/link-building/c/${clientId}`);
    return;
  }
  await db.insert(resourceSubmissions).values(
    fresh.map((id) => ({
      resourceId: id,
      clientId,
      status: "pending" as const,
    })),
  );
  revalidatePath(`/link-building/c/${clientId}`);
}

/** Per-client convenience wrappers for status changes. */
export async function setStatusForClient(
  clientId: number,
  submissionId: number,
  status: "pending" | "submitted" | "live" | "rejected" | "lost",
) {
  if (!Number.isFinite(submissionId) || submissionId <= 0) return;
  const updates: {
    status: typeof status;
    updatedAt: Date;
    submittedAt?: Date;
  } = { status, updatedAt: new Date() };
  if (status === "submitted" || status === "live") {
    updates.submittedAt = new Date();
  }
  await db
    .update(resourceSubmissions)
    .set(updates)
    .where(eq(resourceSubmissions.id, submissionId));
  revalidatePath(`/link-building/c/${clientId}`);
}

export async function setLiveUrlForClient(
  clientId: number,
  submissionId: number,
  formData: FormData,
) {
  if (!Number.isFinite(submissionId) || submissionId <= 0) return;
  const url = String(formData.get("submittedUrl") ?? "").trim();
  await db
    .update(resourceSubmissions)
    .set({
      submittedUrl: url || null,
      status: url ? "live" : "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(resourceSubmissions.id, submissionId));
  revalidatePath(`/link-building/c/${clientId}`);
}

export async function runLinkHealthCheck(
  clientId: number,
): Promise<HealthCheckResult> {
  if (!Number.isFinite(clientId) || clientId <= 0)
    return { checked: 0, lost: 0, errors: 0 };
  const result = await checkClientBacklinkHealth(clientId);
  revalidatePath(`/link-building/c/${clientId}`);
  return result;
}

export async function removeForClient(
  clientId: number,
  submissionId: number,
) {
  if (!Number.isFinite(submissionId) || submissionId <= 0) return;
  await db
    .delete(resourceSubmissions)
    .where(eq(resourceSubmissions.id, submissionId));
  revalidatePath(`/link-building/c/${clientId}`);
}
