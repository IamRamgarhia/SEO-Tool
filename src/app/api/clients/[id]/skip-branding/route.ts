/**
 * Per-client opt-out for the report-generation branding pre-flight.
 * Hit this to set clients.branding_skipped = 1 → the report route no
 * longer prompts the user to fill in brand.name / brand.logo for this
 * client. Re-fillable via the client edit form.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { guardAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = guardAdminRequest(req);
  if (denied) return denied;
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    return Response.json(
      { ok: false, error: "Invalid client id" },
      { status: 400 },
    );
  }
  await db
    .update(clients)
    .set({ brandingSkipped: true, updatedAt: new Date() })
    .where(eq(clients.id, id));
  return Response.json({ ok: true });
}
