import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { keywordRankings, keywords, clients } from "@/db/schema";
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
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const cid = clientId ? Number(clientId) : null;

  const baseQ = db
    .select({
      id: keywords.id,
      query: keywords.query,
      country: keywords.country,
      clientId: keywords.clientId,
      clientName: clients.name,
    })
    .from(keywords)
    .leftJoin(clients, eq(keywords.clientId, clients.id))
    .limit(limit);

  const kwRows = cid ? await baseQ.where(eq(keywords.clientId, cid)) : await baseQ;

  // Latest rank per keyword
  const latestRanks = new Map<number, { position: number | null; checkedAt: Date | null }>();
  if (kwRows.length > 0) {
    const rankRows = await db
      .select()
      .from(keywordRankings)
      .orderBy(desc(keywordRankings.checkedAt));
    for (const r of rankRows) {
      if (!latestRanks.has(r.keywordId)) {
        latestRanks.set(r.keywordId, {
          position: r.position,
          checkedAt: r.checkedAt,
        });
      }
    }
  }

  const enriched = kwRows.map((k) => ({
    ...k,
    latestPosition: latestRanks.get(k.id)?.position ?? null,
    lastCheckedAt: latestRanks.get(k.id)?.checkedAt ?? null,
  }));

  return jsonOk({ keywords: enriched, count: enriched.length });
}
