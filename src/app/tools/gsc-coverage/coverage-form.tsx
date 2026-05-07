"use client";

import { useActionState } from "react";
import { ListChecks, Loader2 } from "lucide-react";
import { runCoverage, type CoverageState } from "./actions";

function tone(state: string | null): string {
  if (!state) return "bg-white/5 text-muted-foreground ring-white/10";
  if (/^(SUBMITTED_AND_INDEXED|PASS|INDEXING_ALLOWED)$/i.test(state))
    return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  if (/PARTIAL/i.test(state)) return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
  return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
}

export function CoverageForm({ properties }: { properties: string[] }) {
  const [state, formAction, pending] = useActionState<
    CoverageState | null,
    FormData
  >(runCoverage, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">GSC property</span>
          <select
            name="site"
            required
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {properties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">URLs (1 per line, max 60)</span>
          <textarea
            name="urls"
            required
            rows={8}
            spellCheck={false}
            placeholder={"https://yoursite.com/page-1\nhttps://yoursite.com/page-2\nhttps://yoursite.com/page-3"}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-emerald-500/15 px-5 text-sm font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Inspecting URLs (this is rate-limited)…
            </>
          ) : (
            <>
              <ListChecks className="mr-2 size-4" />
              Inspect
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
          <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
            <h3 className="mb-3 text-sm font-semibold">Coverage summary</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(state.summary)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <span
                    key={k}
                    className={`rounded-full px-3 py-1 ring-1 ring-inset ${tone(k)}`}
                  >
                    {k}: <span className="font-semibold">{v}</span>
                  </span>
                ))}
            </div>
          </section>

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-3">
              <h3 className="text-sm font-semibold">Per-URL inspection</h3>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">URL</th>
                    <th className="px-4 py-2 text-left">Coverage</th>
                    <th className="px-4 py-2 text-left">Verdict</th>
                    <th className="px-4 py-2 text-left">Crawled as</th>
                    <th className="px-4 py-2 text-left">Last crawl</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((r) => (
                    <tr key={r.url} className="border-t border-white/[0.04]">
                      <td className="px-4 py-1.5">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {r.url.replace(/^https?:\/\/[^/]+/, "")}
                        </a>
                      </td>
                      <td className="px-4 py-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset ${tone(r.coverageState)}`}
                        >
                          {r.coverageState ?? r.error ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset ${tone(r.verdict)}`}
                        >
                          {r.verdict ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 text-muted-foreground">
                        {r.crawledAs ?? "—"}
                      </td>
                      <td className="px-4 py-1.5 text-muted-foreground">
                        {r.lastCrawlTime?.slice(0, 10) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
