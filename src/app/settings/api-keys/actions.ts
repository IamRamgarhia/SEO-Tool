"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { generateKey } from "@/lib/api-auth";

export type CreateApiKeyState =
  | { ok: true; rawKey: string; keyId: number }
  | { ok: false; error: string };

export async function createApiKey(
  _prev: CreateApiKeyState | null,
  formData: FormData,
): Promise<CreateApiKeyState> {
  const name = String(formData.get("name") ?? "").trim();
  const scope = String(formData.get("scope") ?? "read").trim();

  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Name must be 2-80 chars." };
  }
  if (!["read", "write", "admin"].includes(scope)) {
    return { ok: false, error: "Invalid scope." };
  }

  const { raw, hash, prefix } = generateKey();
  const [row] = await db
    .insert(apiKeys)
    .values({
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: [scope as "read" | "write" | "admin"],
    })
    .returning();
  if (!row) return { ok: false, error: "DB insert failed." };

  revalidatePath("/settings");
  return { ok: true, rawKey: raw, keyId: row.id };
}

export async function revokeApiKey(id: number): Promise<{ ok: boolean }> {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id));
  revalidatePath("/settings");
  return { ok: true };
}
