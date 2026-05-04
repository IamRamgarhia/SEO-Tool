"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brandMentions, clients } from "@/db/schema";
import { monitorBrand } from "@/lib/brand-monitor";

export type RunResult =
  | { ok: true; added: number; total: number; errors: string[] }
  | { ok: false; error: string };

export async function runBrandMonitor(clientId: number): Promise<RunResult> {
  if (!Number.isFinite(clientId) || clientId <= 0)
    return { ok: false, error: "Invalid client" };

  const [c] = await db
    .select({
      id: clients.id,
      name: clients.name,
      url: clients.url,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!c) return { ok: false, error: "Client not found" };

  let domain: string | null = null;
  try {
    domain = new URL(/^https?:\/\//i.test(c.url) ? c.url : `https://${c.url}`)
      .hostname.replace(/^www\./, "");
  } catch {
    domain = null;
  }

  const r = await monitorBrand({
    clientId: c.id,
    brandName: c.name,
    domain,
  });

  revalidatePath(`/brand-monitor/c/${clientId}`);
  return { ok: true, ...r };
}

export async function deleteMention(id: number): Promise<void> {
  if (!Number.isFinite(id) || id <= 0) return;
  await db.delete(brandMentions).where(eq(brandMentions.id, id));
  revalidatePath("/brand-monitor");
}
