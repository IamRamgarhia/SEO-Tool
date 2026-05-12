"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { publishQueue } from "@/db/schema";

async function ownItem(itemId: number, clientId: number) {
  const [row] = await db
    .select()
    .from(publishQueue)
    .where(
      and(
        eq(publishQueue.id, itemId),
        eq(publishQueue.clientId, clientId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function approveQueueItem(
  itemId: number,
  clientId: number,
  edits?: { title?: string; body?: string },
): Promise<{ ok: boolean; message: string }> {
  const item = await ownItem(itemId, clientId);
  if (!item) return { ok: false, message: "Queue item not found." };
  if (item.status !== "pending_review") {
    return { ok: false, message: `Already ${item.status.replace("_", " ")}.` };
  }
  await db
    .update(publishQueue)
    .set({
      status: "approved",
      title: edits?.title ?? item.title,
      body: edits?.body ?? item.body,
      updatedAt: new Date(),
    })
    .where(eq(publishQueue.id, itemId));
  revalidatePath(`/clients/${clientId}/queue`);
  return {
    ok: true,
    message: "Approved. Publishes on the next daily-agent tick (≤24h).",
  };
}

/**
 * Approve + publish immediately. Best path for the user who wants to
 * see the end-to-end loop working today rather than waiting for the
 * next tick.
 */
export async function approveAndPublishNow(
  itemId: number,
  clientId: number,
  edits?: { title?: string; body?: string },
): Promise<{ ok: boolean; message: string }> {
  const item = await ownItem(itemId, clientId);
  if (!item) return { ok: false, message: "Queue item not found." };
  if (item.status === "published") {
    return { ok: false, message: "Already published." };
  }
  await db
    .update(publishQueue)
    .set({
      status: "approved",
      title: edits?.title ?? item.title,
      body: edits?.body ?? item.body,
      updatedAt: new Date(),
    })
    .where(eq(publishQueue.id, itemId));
  const { tickQueuePublish } = await import("@/lib/daily-automations");
  const r = await tickQueuePublish();
  revalidatePath(`/clients/${clientId}/queue`);
  if (r.published > 0) return { ok: true, message: "Published." };
  if (r.failed > 0) {
    // Re-read to surface the error message
    const [post] = await db
      .select()
      .from(publishQueue)
      .where(eq(publishQueue.id, itemId))
      .limit(1);
    return {
      ok: false,
      message: `Publish failed: ${post?.errorMsg ?? "unknown error"}`,
    };
  }
  return {
    ok: true,
    message:
      "Approved but not picked up immediately. Will retry on the next tick.",
  };
}

export async function rejectQueueItem(
  itemId: number,
  clientId: number,
  note?: string,
): Promise<void> {
  await db
    .update(publishQueue)
    .set({
      status: "skipped",
      reviewNote: note?.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publishQueue.id, itemId),
        eq(publishQueue.clientId, clientId),
      ),
    );
  revalidatePath(`/clients/${clientId}/queue`);
}

export async function deleteQueueItem(
  itemId: number,
  clientId: number,
): Promise<void> {
  await db
    .delete(publishQueue)
    .where(
      and(
        eq(publishQueue.id, itemId),
        eq(publishQueue.clientId, clientId),
      ),
    );
  revalidatePath(`/clients/${clientId}/queue`);
}
