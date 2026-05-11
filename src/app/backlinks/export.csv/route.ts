import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { backlinks, clients } from "@/db/schema";
import { csvResponse } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: backlinks.id,
      clientName: clients.name,
      sourceUrl: backlinks.sourceUrl,
      sourceDomain: backlinks.sourceDomain,
      targetUrl: backlinks.targetUrl,
      anchorText: backlinks.anchorText,
      domainAuthority: backlinks.domainAuthority,
      status: backlinks.status,
      source: backlinks.source,
      notes: backlinks.notes,
      createdAt: backlinks.createdAt,
    })
    .from(backlinks)
    .leftJoin(clients, eq(backlinks.clientId, clients.id))
    .orderBy(desc(backlinks.createdAt));

  return csvResponse(
    "backlinks.csv",
    [
      "id",
      "clientName",
      "sourceUrl",
      "sourceDomain",
      "targetUrl",
      "anchorText",
      "domainAuthority",
      "status",
      "source",
      "notes",
      "createdAt",
    ],
    rows.map((r) => [
      r.id,
      r.clientName ?? "",
      r.sourceUrl,
      r.sourceDomain,
      r.targetUrl ?? "",
      r.anchorText ?? "",
      r.domainAuthority ?? "",
      r.status,
      r.source,
      r.notes ?? "",
      r.createdAt,
    ]),
  );
}
