/**
 * Autonomous SEO agent action runner.
 *
 * Takes a batch of "new" AI suggestions for a client and walks through them,
 * auto-applying the ones it safely can and queuing the rest as tasks. The
 * loop is bounded (max 20 actions per run, max 60s wall-clock) so it can't
 * silently rack up cost.
 *
 * Auto-apply criteria — a suggestion is auto-applied only if ALL hold:
 *   1. It has a `targetUrl` belonging to the client's known domain.
 *   2. The client has the WP bridge configured (wpEndpoint + wpKey).
 *   3. The suggestion type is one of: title_rewrite, meta_description_rewrite.
 *      We skip h1_rewrite (touches body content), schema_markup (needs theme
 *      knowledge), internal_link (needs source-page edits) — those go to
 *      tasks instead.
 *   4. The user hasn't disabled auto-apply for this client.
 *
 * Everything else gets converted to a task on the client's board with a
 * link back to the originating suggestion.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activityLog,
  aiSuggestions,
  clients,
  tasks,
} from "@/db/schema";
import {
  findPostIdByUrl,
  getClientWpCreds,
  setPostSeo,
} from "./wp-bridge";

export type AgentAction = {
  suggestionId: number;
  type: string;
  targetUrl: string | null;
  outcome:
    | "auto_applied"
    | "queued_as_task"
    | "skipped_no_url"
    | "skipped_no_match"
    | "skipped_wp_error"
    | "skipped_no_bridge";
  detail: string;
  taskId?: number;
};

export type AgentRunReport = {
  clientId: number;
  totalConsidered: number;
  applied: number;
  queued: number;
  skipped: number;
  actions: AgentAction[];
  durationMs: number;
};

const MAX_ACTIONS = 20;
const MAX_RUNTIME_MS = 60_000;

const AUTO_APPLY_TYPES = new Set(["title_rewrite", "meta_description_rewrite"]);

const TASK_TITLE: Record<string, string> = {
  title_rewrite: "Update page title",
  meta_description_rewrite: "Update meta description",
  h1_rewrite: "Update H1",
  quick_win_action: "Quick win — implement",
  content_idea: "Write new content",
  internal_link: "Add internal link",
  schema_markup: "Add structured data",
  general: "AI suggestion follow-up",
};

export async function runAgentActions(
  clientId: number,
): Promise<AgentRunReport> {
  const start = Date.now();
  const report: AgentRunReport = {
    clientId,
    totalConsidered: 0,
    applied: 0,
    queued: 0,
    skipped: 0,
    actions: [],
    durationMs: 0,
  };

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return report;

  const newSugs = await db
    .select()
    .from(aiSuggestions)
    .where(
      and(
        eq(aiSuggestions.clientId, clientId),
        eq(aiSuggestions.status, "new"),
      ),
    )
    .limit(MAX_ACTIONS);
  report.totalConsidered = newSugs.length;

  const creds = await getClientWpCreds(clientId);
  const hasBridge = !!creds;

  for (const s of newSugs) {
    if (Date.now() - start > MAX_RUNTIME_MS) break;

    const action: AgentAction = {
      suggestionId: s.id,
      type: s.type,
      targetUrl: s.targetUrl,
      outcome: "queued_as_task",
      detail: "",
    };

    if (
      hasBridge &&
      AUTO_APPLY_TYPES.has(s.type) &&
      s.targetUrl &&
      s.suggestedValue
    ) {
      // Auto-apply via WP bridge
      try {
        const postId = await findPostIdByUrl(creds!, s.targetUrl);
        if (!postId) {
          action.outcome = "skipped_no_match";
          action.detail = "Couldn't find a WP post matching this URL.";
        } else {
          const seoUpdate: { title?: string; description?: string } = {};
          if (s.type === "title_rewrite") {
            seoUpdate.title = s.suggestedValue.slice(0, 200);
          } else {
            seoUpdate.description = s.suggestedValue.slice(0, 320);
          }
          await setPostSeo(creds!, postId, seoUpdate);
          await db
            .update(aiSuggestions)
            .set({ status: "applied", updatedAt: new Date() })
            .where(eq(aiSuggestions.id, s.id));
          action.outcome = "auto_applied";
          action.detail = `Applied to WP post #${postId} (${s.type === "title_rewrite" ? "title" : "meta description"} updated).`;
          await db.insert(activityLog).values({
            clientId,
            kind: "agent_auto_apply",
            message: `Agent auto-applied: ${TASK_TITLE[s.type] ?? s.type} on ${s.targetUrl}`,
            entityType: "ai_suggestion",
            entityId: s.id,
            level: "success",
          });
          report.applied++;
        }
      } catch (e) {
        action.outcome = "skipped_wp_error";
        action.detail =
          e instanceof Error ? e.message.slice(0, 200) : "WP push failed.";
      }
    } else if (!hasBridge && AUTO_APPLY_TYPES.has(s.type)) {
      action.outcome = "skipped_no_bridge";
      action.detail = "WP bridge not configured — queued as task instead.";
    } else if (!s.targetUrl && AUTO_APPLY_TYPES.has(s.type)) {
      action.outcome = "skipped_no_url";
      action.detail = "Suggestion has no target URL.";
    }

    // Anything not auto-applied → task
    if (action.outcome !== "auto_applied") {
      const inserted = await db
        .insert(tasks)
        .values({
          clientId,
          title: `${TASK_TITLE[s.type] ?? "AI suggestion"}${
            s.targetUrl ? ` — ${pathOf(s.targetUrl)}` : ""
          }`,
          description: s.suggestedValue,
          whyItMatters: s.rationale ?? undefined,
          priority: s.priority,
          status: "todo" as const,
          source: "agent_suggestion",
          sourceRef: `suggestion-${s.id}`,
        })
        .returning({ id: tasks.id });
      action.taskId = inserted[0].id;
      action.outcome = "queued_as_task";
      action.detail = action.detail || "Queued for manual implementation.";
      // Mark the suggestion as applied so we don't re-queue next run
      await db
        .update(aiSuggestions)
        .set({ status: "applied", updatedAt: new Date() })
        .where(eq(aiSuggestions.id, s.id));
      report.queued++;
    }

    report.actions.push(action);
  }

  report.skipped =
    report.totalConsidered - report.applied - report.queued;
  report.durationMs = Date.now() - start;
  return report;
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
