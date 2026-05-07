"use server";

import { z } from "zod";
import {
  findTrendingIdeas,
  type TrendingResult,
} from "@/lib/trending-ideas";

const inputSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(4).default("US"),
});

export type TrendingState =
  | { ok: true; result: TrendingResult }
  | { ok: false; error: string };

export async function runTrending(
  _prev: TrendingState | null,
  formData: FormData,
): Promise<TrendingState> {
  const parsed = inputSchema.safeParse({
    topic: formData.get("topic"),
    country: formData.get("country") || "US",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const r = await findTrendingIdeas({
    topic: parsed.data.topic,
    country: parsed.data.country,
  });
  if (!r.ok && r.error) return { ok: false, error: r.error };
  return { ok: true, result: r };
}
