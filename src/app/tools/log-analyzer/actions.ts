"use server";

import { analyzeLogs, type LogAnalysis } from "@/lib/log-analyzer";

export type LogAnalyzeState =
  | { ok: true; result: LogAnalysis }
  | { ok: false; error: string };

export async function runLogAnalysis(
  _prev: LogAnalyzeState | null,
  formData: FormData,
): Promise<LogAnalyzeState> {
  const raw = String(formData.get("log") ?? "").trim();
  const filter = String(formData.get("filter") ?? "all") as
    | "all"
    | "search-only"
    | "ai-only";
  if (!raw) return { ok: false, error: "Paste at least one log line." };
  if (raw.length > 30_000_000) {
    return { ok: false, error: "Log too large (>30MB). Tail the recent portion and retry." };
  }
  try {
    const result = analyzeLogs(raw, { botFilter: filter });
    if (result.parsedLines === 0) {
      return {
        ok: false,
        error:
          "Couldn't parse any lines. Combined log format expected (most Apache + Nginx access logs). Quick fix: in Nginx, set log_format combined.",
      };
    }
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Analysis failed" };
  }
}
