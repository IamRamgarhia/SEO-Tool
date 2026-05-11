import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { reportArchives, clients } from "@/db/schema";
import { csvResponse } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: reportArchives.id,
      clientName: clients.name,
      title: reportArchives.title,
      template: reportArchives.template,
      periodStart: reportArchives.periodStart,
      periodEnd: reportArchives.periodEnd,
      execSummary: reportArchives.execSummary,
      pdfBytes: reportArchives.pdfBytes,
      pinned: reportArchives.pinned,
      createdAt: reportArchives.createdAt,
    })
    .from(reportArchives)
    .leftJoin(clients, eq(reportArchives.clientId, clients.id))
    .orderBy(desc(reportArchives.createdAt));

  return csvResponse(
    "reports.csv",
    [
      "id",
      "clientName",
      "title",
      "template",
      "periodStart",
      "periodEnd",
      "execSummary",
      "pdfBytes",
      "pinned",
      "createdAt",
    ],
    rows.map((r) => [
      r.id,
      r.clientName ?? "",
      r.title,
      r.template ?? "",
      r.periodStart ?? "",
      r.periodEnd ?? "",
      r.execSummary ?? "",
      r.pdfBytes ?? "",
      r.pinned ? "true" : "false",
      r.createdAt,
    ]),
  );
}
