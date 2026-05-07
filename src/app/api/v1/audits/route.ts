import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { audits, clients } from "@/db/schema";
import {
  authenticateRequest,
  jsonError,
  jsonOk,
  requireScope,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key = await authenticateRequest(req);
  if (!key) return jsonError(401, "Unauthorized");
  if (!requireScope(key, "read")) return jsonError(403, "Read scope required.");

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const cid = clientId ? Number(clientId) : null;

  const q = db
    .select({
      id: audits.id,
      clientId: audits.clientId,
      clientName: clients.name,
      score: audits.score,
      issuesCount: audits.issuesCount,
      status: audits.status,
      startedAt: audits.startedAt,
      completedAt: audits.completedAt,
    })
    .from(audits)
    .leftJoin(clients, eq(audits.clientId, clients.id))
    .orderBy(desc(audits.createdAt))
    .limit(limit);

  const rows = cid
    ? await q.where(eq(audits.clientId, cid))
    : await q;

  return jsonOk({ audits: rows, count: rows.length });
}
