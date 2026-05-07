/**
 * AI usage tracking — logs every callAI invocation to the ai_calls table,
 * computes cost, enforces optional monthly cap.
 *
 * Used by ai-call.ts and the /settings/ai-usage page.
 */

import { gte, sum } from "drizzle-orm";
import { db } from "@/db/client";
import { aiCalls } from "@/db/schema";
import { costMicros, estimateTokens } from "./ai-cost";
import { getSetting } from "./settings-store";

export async function logAiCall(opts: {
  feature: string;
  provider: string;
  model: string | null;
  promptText: string;
  completionText: string | null;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  clientId?: number | null;
  status?: "ok" | "error" | "blocked_by_cap";
  errorMsg?: string;
}): Promise<void> {
  const promptTokens =
    opts.promptTokens ?? estimateTokens(opts.promptText);
  const completionTokens =
    opts.completionTokens ?? estimateTokens(opts.completionText ?? "");
  const total = promptTokens + completionTokens;
  const cost = costMicros(opts.model, promptTokens, completionTokens);

  try {
    await db.insert(aiCalls).values({
      feature: opts.feature,
      provider: opts.provider,
      model: opts.model,
      promptTokens,
      completionTokens,
      totalTokens: total,
      costMicros: cost,
      latencyMs: opts.latencyMs ?? null,
      clientId: opts.clientId ?? null,
      status: opts.status ?? "ok",
      errorMsg: opts.errorMsg ?? null,
    });
  } catch {
    // Never let usage logging block a real AI call
  }
}

/**
 * Has the user hit their monthly cap?
 * Returns { capped, capUsd, spentUsd } — caller decides whether to block.
 */
export async function checkMonthlyCap(): Promise<{
  capUsd: number | null;
  spentUsd: number;
  capped: boolean;
}> {
  const capRaw = await getSetting<number | string>("ai.monthly_cap_usd");
  const capUsd = capRaw ? Number(capRaw) : null;

  // Sum cost_micros for the current calendar month
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  let spentMicros = 0;
  try {
    const [row] = await db
      .select({ total: sum(aiCalls.costMicros) })
      .from(aiCalls)
      .where(gte(aiCalls.createdAt, monthStart));
    spentMicros = Number(row?.total ?? 0);
  } catch {
    spentMicros = 0;
  }

  const spentUsd = spentMicros / 1_000_000;
  const capped =
    capUsd !== null && Number.isFinite(capUsd) && capUsd > 0 && spentUsd >= capUsd;

  return { capUsd, spentUsd, capped };
}
