"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { authorAuthorityRecords, clients } from "@/db/schema";
import {
  persistAuthors,
  scanDomainAuthors,
  type AuthorObservation,
} from "@/lib/author-authority";

export type ScanState =
  | {
      ok: true;
      observations: AuthorObservation[];
      stored: { inserted: number; updated: number };
    }
  | { ok: false; error: string }
  | null;

export async function runAuthorScan(
  _prev: ScanState,
  formData: FormData,
): Promise<ScanState> {
  const clientId = Number(formData.get("clientId"));
  const domain = String(formData.get("domain") ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const topicsRaw = String(formData.get("topics") ?? "").trim();
  if (!Number.isFinite(clientId) || clientId <= 0)
    return { ok: false, error: "Pick a client first." };
  if (!domain) return { ok: false, error: "Domain required." };
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Client not found." };
  const topics = topicsRaw
    ? topicsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  try {
    const observations = await scanDomainAuthors({
      domain,
      niche: client.niche,
      topicHints: topics,
      maxAuthors: 20,
    });
    const stored = await persistAuthors({ clientId, observations });
    revalidatePath("/author-authority");
    return { ok: true, observations, stored };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Scan failed.",
    };
  }
}

export async function listAuthorRecords(clientId: number) {
  if (!Number.isFinite(clientId) || clientId <= 0) return [];
  return db
    .select()
    .from(authorAuthorityRecords)
    .where(eq(authorAuthorityRecords.clientId, clientId))
    .orderBy(desc(authorAuthorityRecords.authorityScore));
}
