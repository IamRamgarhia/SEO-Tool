"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, guestPostDrafts } from "@/db/schema";
import {
  reviewGuestPostDraft,
  writeGuestPost,
} from "@/lib/guest-post-writer";
import { getGuestPostSiteById } from "@/lib/guest-post-sites";

export type GenerateState =
  | {
      ok: true;
      draftId: number;
      siteName: string;
      markdown: string;
      qa: { severity: string; message: string }[];
      meta: {
        wordCount: number;
        targetKeywordOccurrences: number;
        headingsCount: number;
      };
    }
  | { ok: false; error: string }
  | null;

export async function generateGuestPost(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const clientId = Number(formData.get("clientId"));
  const siteId = String(formData.get("siteId") ?? "");
  const topic = String(formData.get("topic") ?? "").trim();
  const targetKeyword = String(formData.get("targetKeyword") ?? "").trim();
  const supportingKeywords = String(formData.get("supportingKeywords") ?? "").trim();
  const authorName = String(formData.get("authorName") ?? "").trim();
  const authorBio = String(formData.get("authorBio") ?? "").trim();

  if (!Number.isFinite(clientId) || clientId <= 0)
    return { ok: false, error: "Bad client id." };
  if (!siteId) return { ok: false, error: "Pick a target platform." };
  if (!topic) return { ok: false, error: "Topic is required." };
  if (!targetKeyword)
    return { ok: false, error: "Target keyword is required." };

  const site = getGuestPostSiteById(siteId);
  if (!site) return { ok: false, error: `Unknown platform: ${siteId}` };

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Client not found." };

  const result = await writeGuestPost({
    siteId,
    clientName: client.name,
    clientUrl: client.url,
    niche: client.niche,
    city: client.city,
    topic,
    targetKeyword,
    supportingKeywords: supportingKeywords || undefined,
    authorName: authorName || undefined,
    authorBio: authorBio || undefined,
  });
  if (!result.ok) return { ok: false, error: result.error };

  const qa = reviewGuestPostDraft(result.markdown, site, targetKeyword);

  const inserted = await db
    .insert(guestPostDrafts)
    .values({
      clientId,
      siteId,
      siteName: site.name,
      siteDomain: site.domain,
      topic,
      targetKeyword,
      supportingKeywords: supportingKeywords || null,
      authorName: authorName || null,
      authorBio: authorBio || null,
      markdown: result.markdown,
      qaIssues: qa,
      status: "draft",
    })
    .returning({ id: guestPostDrafts.id });

  revalidatePath(`/guest-posts/c/${clientId}`);
  return {
    ok: true,
    draftId: inserted[0].id,
    siteName: site.name,
    markdown: result.markdown,
    qa,
    meta: result.meta,
  };
}

export async function updateDraftMarkdown(
  draftId: number,
  formData: FormData,
) {
  const md = String(formData.get("markdown") ?? "");
  const [d] = await db
    .select({ clientId: guestPostDrafts.clientId, siteId: guestPostDrafts.siteId, targetKeyword: guestPostDrafts.targetKeyword })
    .from(guestPostDrafts)
    .where(eq(guestPostDrafts.id, draftId))
    .limit(1);
  if (!d) return;

  const site = getGuestPostSiteById(d.siteId);
  const qa = site ? reviewGuestPostDraft(md, site, d.targetKeyword) : [];

  await db
    .update(guestPostDrafts)
    .set({ markdown: md, qaIssues: qa, updatedAt: new Date() })
    .where(eq(guestPostDrafts.id, draftId));
  revalidatePath(`/guest-posts/c/${d.clientId}`);
}

export async function setDraftStatus(
  draftId: number,
  status: "draft" | "pitched" | "accepted" | "published" | "rejected",
  liveUrl?: string,
) {
  const [d] = await db
    .select({ clientId: guestPostDrafts.clientId })
    .from(guestPostDrafts)
    .where(eq(guestPostDrafts.id, draftId))
    .limit(1);
  if (!d) return;
  const updates: {
    status: typeof status;
    updatedAt: Date;
    pitchedAt?: Date;
    publishedAt?: Date;
    liveUrl?: string | null;
  } = { status, updatedAt: new Date() };
  if (status === "pitched") updates.pitchedAt = new Date();
  if (status === "published") {
    updates.publishedAt = new Date();
    if (liveUrl) updates.liveUrl = liveUrl;
  }
  await db
    .update(guestPostDrafts)
    .set(updates)
    .where(eq(guestPostDrafts.id, draftId));
  revalidatePath(`/guest-posts/c/${d.clientId}`);
}

export async function setDraftLiveUrl(draftId: number, formData: FormData) {
  const url = String(formData.get("liveUrl") ?? "").trim();
  const [d] = await db
    .select({ clientId: guestPostDrafts.clientId })
    .from(guestPostDrafts)
    .where(eq(guestPostDrafts.id, draftId))
    .limit(1);
  if (!d) return;
  await db
    .update(guestPostDrafts)
    .set({
      liveUrl: url || null,
      status: url ? "published" : "accepted",
      publishedAt: url ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(guestPostDrafts.id, draftId));
  revalidatePath(`/guest-posts/c/${d.clientId}`);
}

export async function deleteDraft(draftId: number) {
  const [d] = await db
    .select({ clientId: guestPostDrafts.clientId })
    .from(guestPostDrafts)
    .where(eq(guestPostDrafts.id, draftId))
    .limit(1);
  if (!d) return;
  await db.delete(guestPostDrafts).where(eq(guestPostDrafts.id, draftId));
  revalidatePath(`/guest-posts/c/${d.clientId}`);
}

export async function listDraftsForClient(clientId: number) {
  return db
    .select()
    .from(guestPostDrafts)
    .where(eq(guestPostDrafts.clientId, clientId))
    .orderBy(desc(guestPostDrafts.createdAt));
}

// Used elsewhere — silence lint warning if unused at import site
export const _ = and;
