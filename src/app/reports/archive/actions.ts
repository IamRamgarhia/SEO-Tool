"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { reportArchives } from "@/db/schema";

export async function deleteArchivedReport(id: number) {
  await db.delete(reportArchives).where(eq(reportArchives.id, id));
  revalidatePath("/reports/archive");
}

export async function pinArchivedReport(id: number) {
  const [r] = await db
    .select({ pinned: reportArchives.pinned })
    .from(reportArchives)
    .where(eq(reportArchives.id, id))
    .limit(1);
  if (!r) return;
  await db
    .update(reportArchives)
    .set({ pinned: !r.pinned })
    .where(eq(reportArchives.id, id));
  revalidatePath("/reports/archive");
}
