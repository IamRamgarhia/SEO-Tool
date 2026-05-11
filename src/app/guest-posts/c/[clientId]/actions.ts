"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, guestPostDrafts } from "@/db/schema";
import {
  reviewGuestPostDraft,
  writeGuestPost,
} from "@/lib/guest-post-writer";
import { getGuestPostSiteById } from "@/lib/guest-post-sites";
import { callAI } from "@/lib/ai-call";

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
  const aiProvider = String(formData.get("aiProvider") ?? "").trim();
  const aiModel = String(formData.get("aiModel") ?? "").trim();

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
    providerOverride: aiProvider
      ? (aiProvider as import("@/lib/api-keys").ActiveProvider)
      : undefined,
    modelOverride: aiModel || undefined,
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

export type SuggestTitlesState =
  | { ok: true; titles: { title: string; angle: string }[] }
  | { ok: false; error: string }
  | null;

/**
 * Suggest 5-7 strong guest-post titles tailored to the target site's style
 * + the client's niche + a target keyword the client wants to rank for.
 *
 * The AI is told the site's house style + must-do / must-avoid rules, so
 * titles come back already shaped for that publication. Each title is
 * paired with a one-sentence "angle" explaining why it works.
 */
export async function suggestGuestPostTitles(
  _prev: SuggestTitlesState,
  formData: FormData,
): Promise<SuggestTitlesState> {
  const clientId = Number(formData.get("clientId"));
  const siteId = String(formData.get("siteId") ?? "");
  const targetKeyword = String(formData.get("targetKeyword") ?? "").trim();
  const additionalContext = String(
    formData.get("additionalContext") ?? "",
  ).trim();

  if (!Number.isFinite(clientId)) return { ok: false, error: "Bad client id." };
  if (!siteId) return { ok: false, error: "Pick a target platform first." };
  if (!targetKeyword)
    return { ok: false, error: "A target keyword guides the titles." };

  const site = getGuestPostSiteById(siteId);
  if (!site) return { ok: false, error: `Unknown platform: ${siteId}` };

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Client not found." };

  const system = `You are a senior editor for ${site.name} (${site.domain}). Suggest exactly 6 guest-post titles a contributor could pitch.

Site house rules:
- Tone: ${site.style.tone}
- Voice: ${site.style.voice}
- Target length: ${site.style.wordCount.ideal} words (range ${site.style.wordCount.min}-${site.style.wordCount.max})
- MUST DO: ${site.style.mustDo.join("; ") || "engage on the topic"}
- MUST AVOID: ${site.style.mustAvoid.join("; ") || "fluff"}

Output STRICT JSON, no preamble, no markdown fences:
{
  "titles": [
    { "title": "<exact pitch-ready title, 8-12 words>", "angle": "<one sentence explaining why it works for this site>" }
  ]
}

Rules:
- 6 titles total. No fewer.
- Each title must be distinct in angle (not just rewording).
- Mix types: one How-to, one Listicle, one Contrarian take, one Case-study, one Beginner-guide, one Deep-research.
- Embed the target keyword (or a close variant) naturally in at least 4 of the 6.
- No clickbait. No "ultimate guide" / "you won't believe" tropes.`;

  const user = `Client: ${client.name} (${client.url})${client.niche ? `, niche: ${client.niche}` : ""}${client.city ? `, city: ${client.city}` : ""}
Target keyword: ${targetKeyword}
${additionalContext ? `\nExtra context: ${additionalContext}` : ""}

Return the JSON.`;

  const raw = await callAI({
    system,
    user,
    maxTokens: 1200,
    temperature: 0.7,
    feature: "content_idea",
    ignoreCreditSaver: true,
  });
  if (!raw) {
    return {
      ok: false,
      error:
        "AI provider not configured — set one up in Settings → AI first.",
    };
  }

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as {
      titles?: { title: string; angle: string }[];
    };
    if (!parsed.titles || parsed.titles.length === 0) {
      return { ok: false, error: "AI returned no titles. Try again." };
    }
    return { ok: true, titles: parsed.titles };
  } catch {
    return {
      ok: false,
      error: "Couldn't parse the AI's response — try again.",
    };
  }
}

