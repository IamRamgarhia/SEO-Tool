"use server";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { inboundWebhooks } from "@/db/schema";

export type CreateInboundState =
  | { ok: true; token: string; id: number }
  | { ok: false; error: string };

export async function createInboundWebhook(
  _prev: CreateInboundState | null,
  formData: FormData,
): Promise<CreateInboundState> {
  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "generic").trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Name must be 2-80 chars." };
  }
  const token = `wh_${crypto.randomBytes(20).toString("base64url")}`;
  const [row] = await db
    .insert(inboundWebhooks)
    .values({
      name,
      eventType,
      token,
      enabled: true,
    })
    .returning();
  if (!row) return { ok: false, error: "DB insert failed." };
  revalidatePath("/settings");
  return { ok: true, token, id: row.id };
}

export async function deleteInboundWebhook(id: number): Promise<{ ok: true }> {
  await db.delete(inboundWebhooks).where(eq(inboundWebhooks.id, id));
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleInboundWebhook(
  id: number,
  enabled: boolean,
): Promise<{ ok: true }> {
  await db
    .update(inboundWebhooks)
    .set({ enabled })
    .where(eq(inboundWebhooks.id, id));
  revalidatePath("/settings");
  return { ok: true };
}
