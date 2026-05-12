"use server";

/**
 * Server actions for the AI-tools findings checklist.
 *
 *   markFindingStatus(findingId, status, note?) — flips a finding's
 *     status (new / in_progress / resolved / ignored)
 *
 *   getFindingsForRun(runId) — returns the list for a given tool_run
 *
 * The findings table is shared across every AI tool (SXO, GEO, E-E-A-T,
 * AI site audit, …) so this UI works the same everywhere — each tool
 * just persists rows pointing at its own tool_run + a stable signature.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { toolFindings, type ToolFinding } from "@/db/schema";
import { revalidatePath } from "next/cache";

export type FindingStatus = "new" | "in_progress" | "resolved" | "ignored";

export async function markFindingStatus(
  findingId: number,
  status: FindingStatus,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(findingId)) {
    return { ok: false, error: "Invalid finding id" };
  }
  const completedAt = status === "resolved" ? new Date() : null;
  try {
    await db
      .update(toolFindings)
      .set({
        status,
        completedAt,
        completedNote: note?.slice(0, 500) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(toolFindings.id, findingId));
    // Best-effort revalidate — caller pages re-render with the new status
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getFindingsForRun(
  runId: number,
): Promise<ToolFinding[]> {
  return db
    .select()
    .from(toolFindings)
    .where(eq(toolFindings.runId, runId))
    .orderBy(desc(toolFindings.severity), desc(toolFindings.createdAt));
}
