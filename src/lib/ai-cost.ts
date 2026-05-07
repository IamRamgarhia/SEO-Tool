/**
 * AI cost rate table (USD per 1M tokens). Approximate, edit if vendors change.
 * Conservative — we round UP for "credit-saver" purposes.
 *
 * Returns micros (millionths of a dollar). 1 USD = 1_000_000 micros.
 */

export type CostRate = {
  inputPer1M: number; // USD
  outputPer1M: number;
};

const RATES: Record<string, CostRate> = {
  // OpenAI
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },

  // Anthropic
  "claude-haiku-4-5-20251001": { inputPer1M: 1, outputPer1M: 5 },

  // Google
  "gemini-1.5-flash-latest": { inputPer1M: 0.075, outputPer1M: 0.3 },

  // Groq — free tier is $0 effective; we still track tokens
  "llama-3.3-70b-versatile": { inputPer1M: 0.59, outputPer1M: 0.79 }, // Groq paid

  // OpenRouter free Llama
  "meta-llama/llama-3.3-70b-instruct:free": { inputPer1M: 0, outputPer1M: 0 },

  // Perplexity sonar
  sonar: { inputPer1M: 1, outputPer1M: 1 },

  // Ollama / local
  llama3: { inputPer1M: 0, outputPer1M: 0 },
  llama32: { inputPer1M: 0, outputPer1M: 0 },
};

const FALLBACK_RATE: CostRate = { inputPer1M: 1, outputPer1M: 4 };

export function rateFor(model: string | null | undefined): CostRate {
  if (!model) return FALLBACK_RATE;
  if (RATES[model]) return RATES[model];
  // Try lowercased
  if (RATES[model.toLowerCase()]) return RATES[model.toLowerCase()];
  return FALLBACK_RATE;
}

export function costMicros(
  model: string | null | undefined,
  promptTokens: number,
  completionTokens: number,
): number {
  const r = rateFor(model);
  const inUsd = (promptTokens * r.inputPer1M) / 1_000_000;
  const outUsd = (completionTokens * r.outputPer1M) / 1_000_000;
  return Math.round((inUsd + outUsd) * 1_000_000);
}

export function microsToDollars(micros: number): number {
  return micros / 1_000_000;
}

export function microsToDisplay(micros: number): string {
  const usd = microsToDollars(micros);
  if (usd === 0) return "$0";
  if (usd < 0.01) return `<$0.01`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/** Estimate tokens via the standard ~4-char-per-token heuristic. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
