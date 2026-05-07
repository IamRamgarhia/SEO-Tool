/**
 * Public-API key auth. Keys are hashed (sha256) and stored — only the
 * prefix is shown back to the user. Generated keys look like:
 *
 *   seo_live_<32 url-safe chars>
 *
 * Auth header: `Authorization: Bearer <key>`. Returns the matched ApiKey
 * row or null. Caller should 401 on null.
 */

import crypto from "node:crypto";
import { eq, isNull, and, gt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { apiKeys, type ApiKey } from "@/db/schema";

const KEY_PREFIX = "seo_live_";

export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateKey(): { raw: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(24).toString("base64url");
  const raw = `${KEY_PREFIX}${random}`;
  return {
    raw,
    hash: hashKey(raw),
    prefix: raw.slice(0, 16) + "…",
  };
}

/** Validate a request and return the matched key, or null if invalid. */
export async function authenticateRequest(
  req: Request,
): Promise<ApiKey | null> {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const raw = m[1].trim();
  if (!raw.startsWith(KEY_PREFIX)) return null;
  const h = hashKey(raw);

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, h),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
      ),
    )
    .limit(1);
  if (!row) return null;

  // Update last_used_at non-blocking
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .run();

  return row;
}

export function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export function requireScope(
  key: ApiKey,
  scope: "read" | "write" | "admin",
): boolean {
  const scopes = key.scopes ?? ["read"];
  if (scopes.includes("admin")) return true;
  if (scope === "read") return scopes.includes("read") || scopes.includes("write");
  if (scope === "write") return scopes.includes("write");
  return false;
}
