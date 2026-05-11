"use server";

import { z } from "zod";
import {
  suggestInternalLinks,
  type InternalLinkAiResult,
} from "@/lib/internal-link-ai";
import { saveToolRun } from "@/lib/tool-runs";

const inputSchema = z.object({
  siteUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  draft: z.string().trim().min(100).max(50_000),
  excludeUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type RecommendState =
  | { ok: true; result: InternalLinkAiResult }
  | { ok: false; error: string };

export async function recommendLinks(
  _prev: RecommendState | null,
  formData: FormData,
): Promise<RecommendState> {
  const parsed = inputSchema.safeParse({
    siteUrl: formData.get("siteUrl"),
    draft: formData.get("draft"),
    excludeUrl: formData.get("excludeUrl") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const result = await suggestInternalLinks({
      siteUrl: parsed.data.siteUrl,
      draft: parsed.data.draft,
      excludeUrl: parsed.data.excludeUrl,
    });
    await saveToolRun({
      toolId: "link-recommender",
      label: parsed.data.siteUrl,
      input: { siteUrl: parsed.data.siteUrl, excludeUrl: parsed.data.excludeUrl },
      result: { ok: true, result },
    }).catch(() => undefined);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Recommendation failed" };
  }
}
