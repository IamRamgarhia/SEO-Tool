"use server";

import { z } from "zod";
import {
  reverseEngineerCompetitor,
  type CompetitorPlaybook,
} from "@/lib/competitor-playbook";

const inputSchema = z.object({
  competitorUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  myUrl: z
    .string()
    .trim()
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  country: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type PlaybookState =
  | { ok: true; playbook: CompetitorPlaybook }
  | { ok: false; error: string };

export async function runCompetitorAnalysis(
  _prev: PlaybookState | null,
  formData: FormData,
): Promise<PlaybookState> {
  const parsed = inputSchema.safeParse({
    competitorUrl: formData.get("competitorUrl"),
    myUrl: formData.get("myUrl") ?? undefined,
    country: formData.get("country") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const playbook = await reverseEngineerCompetitor({
      competitorUrl: parsed.data.competitorUrl,
      myUrl: parsed.data.myUrl,
      country: parsed.data.country,
      maxPages: 50,
    });
    return { ok: true, playbook };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message ?? "Analysis failed",
    };
  }
}
