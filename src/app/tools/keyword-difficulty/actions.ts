"use server";

import { scanSerp } from "@/lib/serp-scanner";
import { callAI } from "@/lib/ai-call";
import { saveToolRun } from "@/lib/tool-runs";

export type DifficultyResult = {
  ok: true;
  query: string;
  /** 0-100. Higher = harder to rank. Heuristic, not Ahrefs-grade. */
  difficulty: number;
  difficulty_band: "easy" | "moderate" | "hard" | "very_hard";
  intent: "informational" | "commercial" | "transactional" | "navigational";
  /** Plain-language summary from the AI. */
  summary: string | null;
  /** Practical steps from the AI on how to compete. */
  recommendation: string | null;
  signals: {
    aiOverviewPresent: boolean;
    featuredSnippetPresent: boolean;
    localPackPresent: boolean;
    paaCount: number;
    bigBrandsInTop10: number;
    avgWordsInTitle: number;
    uniqueDomainsInTop10: number;
    /** Top 10 result URLs we used for analysis. */
    topResults: { position: number; title: string; domain: string }[];
  };
};

export type DifficultyApiResult =
  | DifficultyResult
  | { ok: false; error: string };

const BIG_BRAND_HOSTS = new Set([
  "wikipedia.org",
  "reddit.com",
  "youtube.com",
  "amazon.com",
  "ebay.com",
  "linkedin.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "quora.com",
  "medium.com",
  "forbes.com",
  "nytimes.com",
  "theguardian.com",
  "washingtonpost.com",
  "businessinsider.com",
  "techcrunch.com",
  "cnn.com",
  "bbc.com",
  "imdb.com",
]);

function inferIntent(
  query: string,
  signals: {
    aiOverviewPresent: boolean;
    localPackPresent: boolean;
    featuredSnippetPresent: boolean;
  },
): DifficultyResult["intent"] {
  const q = query.toLowerCase();
  if (
    /\b(buy|order|cheap|coupon|discount|deal|price|for sale|near me)\b/.test(q)
  ) {
    return "transactional";
  }
  if (signals.localPackPresent) return "transactional";
  if (
    /\b(best|top|review|vs|compare|comparison|alternative)\b/.test(q) ||
    /\b\d{4}\b/.test(q)
  ) {
    return "commercial";
  }
  if (
    /\b(how|what|why|when|guide|tutorial|tips|examples)\b/.test(q) ||
    signals.aiOverviewPresent ||
    signals.featuredSnippetPresent
  ) {
    return "informational";
  }
  // Brand-name searches usually have very low diversity in top results
  return "navigational";
}

function calculateDifficulty(signals: {
  bigBrandsInTop10: number;
  uniqueDomainsInTop10: number;
  avgWordsInTitle: number;
  aiOverviewPresent: boolean;
  featuredSnippetPresent: boolean;
  paaCount: number;
}): number {
  let score = 30; // baseline

  // Big brands in top 10 are the strongest "this is hard" signal
  score += signals.bigBrandsInTop10 * 6;

  // Lots of unique domains = competitive but not dominated
  score += Math.max(0, signals.uniqueDomainsInTop10 - 5) * 3;

  // SERP features eat real estate so harder to win
  if (signals.aiOverviewPresent) score += 8;
  if (signals.featuredSnippetPresent) score += 5;

  // Long titles in top 10 = competitors invest heavily
  if (signals.avgWordsInTitle > 9) score += 6;
  else if (signals.avgWordsInTitle > 7) score += 3;

  // Lots of PAA = topic has known sub-questions to address (you can win them)
  // — slight reduction, this is good news
  if (signals.paaCount >= 4) score -= 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function band(d: number): DifficultyResult["difficulty_band"] {
  if (d < 30) return "easy";
  if (d < 55) return "moderate";
  if (d < 75) return "hard";
  return "very_hard";
}

export async function estimateDifficulty(
  rawQuery: string,
): Promise<DifficultyApiResult> {
  const query = rawQuery.trim();
  if (!query) return { ok: false, error: "Enter a keyword" };

  const serp = await scanSerp({ query });
  if (!serp.ok) {
    return {
      ok: false,
      error: serp.error ?? "SERP scrape failed — try again in a minute.",
    };
  }

  const top = serp.topResults.slice(0, 10);
  if (top.length === 0) {
    return {
      ok: false,
      error: "Couldn't read SERP results. Try a different query.",
    };
  }

  const bigBrands = top.filter((r) =>
    [...BIG_BRAND_HOSTS].some(
      (b) =>
        r.domain.toLowerCase().endsWith(b) || r.domain.toLowerCase() === b,
    ),
  ).length;
  const uniqueDomains = new Set(top.map((r) => r.domain.toLowerCase())).size;
  const avgWords =
    top.reduce((s, r) => s + r.title.split(/\s+/).length, 0) / top.length;

  const computedSignals = {
    bigBrandsInTop10: bigBrands,
    uniqueDomainsInTop10: uniqueDomains,
    avgWordsInTitle: Math.round(avgWords * 10) / 10,
    aiOverviewPresent: serp.aiOverviewPresent,
    featuredSnippetPresent: !!serp.featuredSnippet,
    paaCount: serp.paaQuestions.length,
  };

  const difficulty = calculateDifficulty(computedSignals);
  const intent = inferIntent(query, {
    aiOverviewPresent: serp.aiOverviewPresent,
    localPackPresent: serp.localPackPresent,
    featuredSnippetPresent: !!serp.featuredSnippet,
  });

  // Optional AI summary — gracefully degrades if no AI key configured
  const aiContext = `Query: "${query}"
Difficulty score: ${difficulty}/100 (${band(difficulty)})
Intent: ${intent}
SERP features: ${[
    serp.aiOverviewPresent && "AI Overview",
    serp.featuredSnippet && "Featured Snippet",
    serp.localPackPresent && "Local Pack",
    serp.paaQuestions.length > 0 && `${serp.paaQuestions.length} PAA`,
  ]
    .filter(Boolean)
    .join(", ") || "none"}
Top 10 domains: ${top.map((r) => r.domain).join(", ")}
Big-brand sites in top 10: ${bigBrands} (out of ${top.length})
Unique domains: ${uniqueDomains}/${top.length}`;

  const ai = await callAI({
    system:
      "You are a senior SEO consultant. Given a keyword's SERP analysis, write a concise plain-language summary (1-2 sentences) and a recommendation (2-3 sentences) for what type of content / strategy could rank for it. Be specific and concrete. Avoid hedging.",
    user: `${aiContext}\n\nReturn exactly two sections separated by "---":\nSummary: <1-2 sentences>\n---\nRecommendation: <2-3 sentences>`,
    maxTokens: 350,
    temperature: 0.4,
  });

  let summary: string | null = null;
  let recommendation: string | null = null;
  if (ai) {
    const parts = ai.split(/^-{3,}$/m).map((s) => s.trim());
    summary =
      parts[0]
        ?.replace(/^Summary:\s*/i, "")
        .trim() || null;
    recommendation =
      parts[1]
        ?.replace(/^Recommendation:\s*/i, "")
        .trim() || null;
  }

  const result = {
    ok: true as const,
    query,
    difficulty,
    difficulty_band: band(difficulty),
    intent,
    summary,
    recommendation,
    signals: {
      ...computedSignals,
      localPackPresent: serp.localPackPresent,
      topResults: top.map((r) => ({
        position: r.position,
        title: r.title,
        domain: r.domain,
      })),
    },
  };
  await saveToolRun({
    toolId: "keyword-difficulty",
    label: `${query} · ${difficulty}/100 · ${band(difficulty)}`,
    input: { query },
    result,
  }).catch(() => undefined);
  return result;
}
