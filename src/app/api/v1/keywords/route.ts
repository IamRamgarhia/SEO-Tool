import { desc, eq, inArray } from "drizzle-orm";
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

  // Latest rank per keyword — scoped to the keywords this caller asked
  // about, and capped to avoid pulling years of ranking history into
  // memory for the dedup. 10 most-recent rows per keyword is plenty to
  // find the latest, even allowing for same-day duplicates.
  const latestRanks = new Map<number, { position: number | null; checkedAt: Date | null }>();
  if (kwRows.length > 0) {
    const kwIds = kwRows.map((k) => k.id);
    const rankRows = await db
      .select()
      .from(keywordRankings)
      .where(inArray(keywordRankings.keywordId, kwIds))
      .orderBy(desc(keywordRankings.checkedAt))
      .limit(kwIds.length * 10);
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
