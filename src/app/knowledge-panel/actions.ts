"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, knowledgePanelSnapshots } from "@/db/schema";
import {
  captureAndStore,
  type KnowledgePanelData,
} from "@/lib/knowledge-panel-monitor";

export type CaptureState =
  | {
      ok: true;
      snapshotId: number;
      data: KnowledgePanelData;
      changes: string[];
    }
  | { ok: false; error: string }
  | null;

export async function runKpCapture(
  _prev: CaptureState,
  formData: FormData,
): Promise<CaptureState> {
  const clientId = Number(formData.get("clientId"));
  const queryRaw = String(formData.get("query") ?? "").trim();
  if (!Number.isFinite(clientId) || clientId <= 0)
    return { ok: false, error: "Pick a client first." };
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Client not found." };
  const query = queryRaw || client.name;
  try {
    const r = await captureAndStore({ clientId, query });
    revalidatePath("/knowledge-panel");
    return { ok: true, ...r };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Capture failed.",
    };
  }
}

export async function listKpSnapshots(clientId: number, limit = 10) {
  if (!Number.isFinite(clientId) || clientId <= 0) return [];
  return db
    .select()
    .from(knowledgePanelSnapshots)
    .where(eq(knowledgePanelSnapshots.clientId, clientId))
    .orderBy(desc(knowledgePanelSnapshots.capturedAt))
    .limit(limit);
}
