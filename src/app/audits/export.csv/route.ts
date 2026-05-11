import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { audits, clients } from "@/db/schema";
import { csvResponse } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: audits.id,
      clientName: clients.name,
      clientUrl: clients.url,
      kind: audits.kind,
      status: audits.status,
      score: audits.score,
      issuesCount: audits.issuesCount,
      startedAt: audits.startedAt,
      completedAt: audits.completedAt,
      targetUrl: audits.targetUrl,
    })
    .from(audits)
    .leftJoin(clients, eq(audits.clientId, clients.id))
    .orderBy(desc(audits.createdAt));

  return csvResponse(
    "audits.csv",
    [
      "id",
      "clientName",
      "clientUrl",
      "kind",
      "status",
      "score",
      "issuesCount",
      "startedAt",
      "completedAt",
      "targetUrl",
    ],
    rows.map((r) => [
      r.id,
      r.clientName ?? "",
      r.clientUrl ?? "",
      r.kind,
      r.status,
      r.score ?? "",
      r.issuesCount,
      r.startedAt ?? "",
      r.completedAt ?? "",
      r.targetUrl ?? "",
    ]),
  );
}
