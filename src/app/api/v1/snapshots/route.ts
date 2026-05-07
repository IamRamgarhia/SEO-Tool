import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clientMetricSnapshots, clients } from "@/db/schema";
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
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 90), 365);
  const cid = clientId ? Number(clientId) : null;

  const q = db
    .select({
      clientId: clientMetricSnapshots.clientId,
      clientName: clients.name,
      kind: clientMetricSnapshots.kind,
      healthScore: clientMetricSnapshots.healthScore,
      organicClicks: clientMetricSnapshots.organicClicks,
      organicImpressions: clientMetricSnapshots.organicImpressions,
      organicAvgPositionX100: clientMetricSnapshots.organicAvgPositionX100,
      ga4Sessions: clientMetricSnapshots.ga4Sessions,
      ga4Conversions: clientMetricSnapshots.ga4Conversions,
      ga4RevenueX100: clientMetricSnapshots.ga4RevenueX100,
      keywordCount: clientMetricSnapshots.keywordCount,
      avgRankX100: clientMetricSnapshots.avgRankX100,
      top10Count: clientMetricSnapshots.top10Count,
      criticalIssues: clientMetricSnapshots.criticalIssues,
      highIssues: clientMetricSnapshots.highIssues,
      backlinkCount: clientMetricSnapshots.backlinkCount,
      gbpScore: clientMetricSnapshots.gbpScore,
      mentionCount: clientMetricSnapshots.mentionCount,
      capturedAt: clientMetricSnapshots.capturedAt,
    })
    .from(clientMetricSnapshots)
    .leftJoin(clients, eq(clientMetricSnapshots.clientId, clients.id))
    .orderBy(desc(clientMetricSnapshots.capturedAt))
    .limit(limit);

  const rows = cid
    ? await q.where(eq(clientMetricSnapshots.clientId, cid))
    : await q;

  return jsonOk({ snapshots: rows, count: rows.length });
}
