"use server";

import { z } from "zod";
import { simulatePageRank, type PageRankResult } from "@/lib/pagerank";

const schema = z.object({
  startUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  maxPages: z.coerce.number().int().min(20).max(300).default(150),
});

export type PrState =
  | { ok: true; result: PageRankResult }
  | { ok: false; error: string };

export async function runPagerank(
  _prev: PrState | null,
  formData: FormData,
): Promise<PrState> {
  const parsed = schema.safeParse({
    startUrl: formData.get("startUrl"),
    maxPages: formData.get("maxPages") || 150,
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const r = await simulatePageRank(parsed.data);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  return { ok: true, result: r };
}
