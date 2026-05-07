"use server";

import {
  scoreAllPassages,
  suggestRewriteHint,
  type PassageScore,
} from "@/lib/aio-passage-scorer";

export type AnalyzeState =
  | { ok: true; passages: PassageScore[] }
  | { ok: false; error: string }
  | null;

export async function analyzePassages(
  _prev: AnalyzeState,
  formData: FormData,
): Promise<AnalyzeState> {
  const md = String(formData.get("markdown") ?? "").trim();
  if (!md) return { ok: false, error: "Paste a draft first." };
  const passages = scoreAllPassages(md);
  if (passages.length === 0) {
    return {
      ok: false,
      error:
        "Couldn't extract any passages — make sure paragraphs are separated by blank lines.",
    };
  }
  return { ok: true, passages };
}

export async function suggestRewrite(
  passage: string,
  score: number,
): Promise<{ ok: true; rewrite: string } | { ok: false; error: string }> {
  const r = await suggestRewriteHint(passage, score);
  if (!r)
    return {
      ok: false,
      error:
        "AI didn't return a rewrite. Either the passage already scores 70+ or no AI provider is configured.",
    };
  return { ok: true, rewrite: r };
}
