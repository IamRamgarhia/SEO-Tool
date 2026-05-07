import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { reportArchives } from "@/db/schema";

export const dynamic = "force-dynamic";

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "report";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [row] = await db
    .select()
    .from(reportArchives)
    .where(eq(reportArchives.id, id))
    .limit(1);
  if (!row || !row.pdfBase64)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buf = Buffer.from(row.pdfBase64, "base64");
  const filename = `${safeFilename(row.title)}.pdf`;
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.length),
    },
  });
}
