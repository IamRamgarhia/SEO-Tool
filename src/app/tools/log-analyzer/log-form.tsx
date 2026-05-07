"use client";

import { useActionState } from "react";
import { Loader2, ServerCog, Sparkles } from "lucide-react";
import { runLogAnalysis, type LogAnalyzeState } from "./actions";

export function LogAnalyzerForm() {
  const [state, formAction, pending] = useActionState<
    LogAnalyzeState | null,
    FormData
  >(runLogAnalysis, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Filter</span>
          <select
            name="filter"
            defaultValue="search-only"
            className="h-9 w-48 rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            <option value="all">All bots (search + AI)</option>
            <option value="search-only">Search bots only (Googlebot etc)</option>
            <option value="ai-only">AI bots only (GPTBot etc)</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">
            Paste raw Apache / Nginx combined-format log lines (max 30MB)
          </span>
          <textarea
            name="log"
            required
            rows={10}
            spellCheck={false}
            placeholder='66.249.66.5 - - [10/Oct/2025:13:55:36 -0700] "GET / HTTP/1.1" 200 4523 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"'
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-[11px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-violet-500/15 px-5 text-sm font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Crunching log…
            </>
          ) : (
            <>
              <ServerCog className="mr-2 size-4" />
              Analyze
            </>
          )}
        </button>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Stat label="Lines parsed" value={state.result.parsedLines.toLocaleString()} hint={`${state.result.totalLines.toLocaleString()} total`} />
            <Stat label="Bot hits" value={state.result.botLines.toLocaleString()} hint={state.result.botLines === 0 ? "no bots" : "matched filter"} />
            <Stat label="Range from" value={(state.result.range.from ?? "—").slice(0, 10)} hint={(state.result.range.to ?? "—").slice(0, 10)} />
            <Stat label="Status mix" value={`${state.result.byStatus["2xx"] ?? 0}↑`} hint={`${state.result.byStatus["4xx"] ?? 0} 4xx · ${state.result.byStatus["5xx"] ?? 0} 5xx`} />
          </div>

          {state.result.insights.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-amber-300" />
                SEO insights
              </h3>
              <ul className="space-y-1.5 text-sm">
                {state.result.insights.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {Object.keys(state.result.byBot).length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold">Bot share</h3>
              <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 text-xs">
                {Object.entries(state.result.byBot)
                  .sort((a, b) => b[1] - a[1])
                  .map(([bot, hits]) => {
                    const pct = (hits / state.result.botLines) * 100;
                    return (
                      <li key={bot} className="rounded-md bg-white/[0.03] p-2.5 ring-1 ring-inset ring-white/5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{bot}</span>
                          <span className="text-muted-foreground">{hits.toLocaleString()} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-violet-400/70" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          {state.result.topPaths.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <header className="border-b border-white/[0.06] px-5 py-3">
                <h3 className="text-sm font-semibold">Top crawled URLs</h3>
              </header>
              <ul className="divide-y divide-white/[0.05]">
                {state.result.topPaths.map((p) => (
                  <li key={p.path} className="flex items-center justify-between gap-3 px-5 py-2 text-xs">
                    <code className="truncate">{p.path}</code>
                    <span className="text-muted-foreground tabular-nums">
                      {p.hits.toLocaleString()} hits · {(p.bytes / 1024).toFixed(0)}KB
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.result.errorPaths.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <header className="border-b border-white/[0.06] px-5 py-3">
                <h3 className="text-sm font-semibold">Broken / error URLs</h3>
              </header>
              <ul className="divide-y divide-white/[0.05]">
                {state.result.errorPaths.map((p) => (
                  <li key={`${p.path}|${p.status}`} className="flex items-center justify-between gap-3 px-5 py-2 text-xs">
                    <code className="truncate">{p.path}</code>
                    <span className="text-rose-300 tabular-nums">{p.status} · {p.hits} hits</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.result.parameterPaths.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <header className="border-b border-white/[0.06] px-5 py-3">
                <h3 className="text-sm font-semibold">Parameter-URL crawl waste</h3>
              </header>
              <ul className="divide-y divide-white/[0.05]">
                {state.result.parameterPaths.map((p) => (
                  <li key={p.path} className="flex items-center justify-between gap-3 px-5 py-2 text-xs">
                    <code className="truncate">{p.path}?...</code>
                    <span className="text-amber-300 tabular-nums">{p.hits} hits</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
