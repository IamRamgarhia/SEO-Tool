"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, competitors, monitoredPages } from "@/db/schema";
import { fetchSiteMetadata, type SiteMetadata } from "@/lib/site-metadata";

export type CaptureResult =
  | { ok: true; metadata: SiteMetadata }
  | { ok: false; error: string };

export async function captureUrl(rawUrl: string): Promise<CaptureResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false, error: "Paste a URL" };
  try {
    new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: "Not a valid URL" };
  }
  const metadata = await fetchSiteMetadata(trimmed);
  if (!metadata.reachable) {
    return {
      ok: false,
      error:
        "Couldn't reach that URL — check it's correct and publicly accessible.",
    };
  }
  return { ok: true, metadata };
}

export async function saveAsCompetitor(input: {
  clientId: number;
  name: string;
  url: string;
  notes?: string;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (!Number.isFinite(input.clientId) || input.clientId <= 0) {
    return { ok: false, error: "Pick a client" };
  }
  if (!input.name?.trim() || !input.url?.trim()) {
    return { ok: false, error: "Name and URL required" };
  }
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Client not found" };

  const [row] = await db
    .insert(competitors)
    .values({
      clientId: input.clientId,
      name: input.name.trim(),
      url: input.url.trim(),
      notes: input.notes?.trim() || null,
    })
    .returning({ id: competitors.id });

  revalidatePath("/competitors");
  revalidatePath(`/competitors/c/${input.clientId}`);
  return { ok: true, id: row.id };
}

export async function saveAsMonitoredPage(input: {
  clientId: number;
  url: string;
  label?: string;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (!Number.isFinite(input.clientId) || input.clientId <= 0) {
    return { ok: false, error: "Pick a client" };
  }
  if (!input.url?.trim()) return { ok: false, error: "URL required" };

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Client not found" };

  const [row] = await db
    .insert(monitoredPages)
    .values({
      clientId: input.clientId,
      url: input.url.trim(),
      label: input.label?.trim() || null,
      status: "active",
    })
    .returning({ id: monitoredPages.id });

  revalidatePath("/monitor");
  revalidatePath(`/monitor/c/${input.clientId}`);
  return { ok: true, id: row.id };
}
