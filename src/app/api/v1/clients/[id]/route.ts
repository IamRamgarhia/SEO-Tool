import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import {
  authenticateRequest,
  jsonError,
  jsonOk,
  requireScope,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const key = await authenticateRequest(req);
  if (!key) return jsonError(401, "Unauthorized");
  if (!requireScope(key, "read")) return jsonError(403, "Read scope required.");

  const { id } = await params;
  const cid = Number(id);
  if (!Number.isFinite(cid)) return jsonError(400, "Invalid client id");

  const [row] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, cid))
    .limit(1);
  if (!row) return jsonError(404, "Client not found");

  // Strip credential blobs before returning. Stored as ciphertext but
  // still — a caller with read scope shouldn't see them. Defensive
  // pattern: destructure the sensitive fields out, return the rest.
  const {
    googleRefreshToken: _g1,
    googleAccessToken: _g2,
    googleAccessTokenExpiresAt: _g3,
    wpKey: _wp,
    ...safe
  } = row;
  void _g1; void _g2; void _g3; void _wp;

  return jsonOk({ client: safe });
}
