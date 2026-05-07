"use client";

import { useActionState } from "react";
import { Loader2, TrendingDown } from "lucide-react";
import { runDiagnostic, type TrafficDropState } from "./actions";

export function TrafficDropForm({ properties }: { properties: string[] }) {
  const [state, formAction, pending] = useActionState<
    TrafficDropState | null,
    FormData
  >(runDiagnostic, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">GSC property</span>
          <select
            name="siteUrl"
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
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-rose-500/15 px-5 text-sm font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Pulling 56 days of GSC data…
            </>
          ) : (
            <>
              <TrendingDown className="mr-2 size-4" />
              Diagnose drop
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
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Clicks (28d)"
              value={state.result.recentClicks.toLocaleString()}
              hint={`prev ${state.result.prevClicks.toLocaleString()}`}
              tone={state.result.clicksDeltaPct < -5 ? "rose" : state.result.clicksDeltaPct < 0 ? "amber" : "emerald"}
            />
            <Stat
              label="Δ %"
              value={`${state.result.clicksDeltaPct >= 0 ? "+" : ""}${state.result.clicksDeltaPct.toFixed(1)}%`}
              hint={`${state.result.clicksDelta >= 0 ? "+" : ""}${state.result.clicksDelta.toLocaleString()} clicks`}
              tone={state.result.clicksDeltaPct < -5 ? "rose" : state.result.clicksDeltaPct < 0 ? "amber" : "emerald"}
            />
            <Stat
              label="Algorithm overlap"
              value={state.result.algorithmOverlaps.length.toString()}
              hint={
                state.result.algorithmOverlaps.length === 0
                  ? "no updates in window"
                  : state.result.algorithmOverlaps[0].name
              }
              tone={state.result.algorithmOverlaps.length > 0 ? "rose" : "emerald"}
            />
          </div>

          {state.result.diagnosis && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-semibold">AI diagnosis</h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {state.result.diagnosis}
              </pre>
            </section>
          )}

          {state.result.topQueryDrops.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-semibold">Top query drops</h3>
              <ul className="divide-y divide-white/[0.05]">
                {state.result.topQueryDrops.map((d) => (
                  <li
                    key={d.query}
                    className="flex items-center justify-between py-1.5 text-xs"
                  >
                    <span className="truncate font-medium">{d.query}</span>
                    <span className="shrink-0 text-rose-300">
                      {d.prev} → {d.recent} ({d.delta})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.result.topPageDrops.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-semibold">Top page drops</h3>
              <ul className="divide-y divide-white/[0.05]">
                {state.result.topPageDrops.map((d) => (
                  <li
                    key={d.page}
                    className="flex items-center justify-between py-1.5 text-xs"
                  >
                    <a
                      href={d.page}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-medium hover:underline"
                    >
                      {d.page.replace(/^https?:\/\/[^/]+/, "")}
                    </a>
                    <span className="shrink-0 text-rose-300">
                      {d.prev} → {d.recent} ({d.delta})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.result.algorithmOverlaps.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-semibold">
                Algorithm updates overlapping the window
              </h3>
              <ul className="space-y-2 text-xs">
                {state.result.algorithmOverlaps.map((u) => (
                  <li
                    key={u.name}
                    className="rounded-md bg-rose-500/5 p-3 ring-1 ring-inset ring-rose-500/20"
                  >
                    <div className="font-medium text-rose-200">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {u.date} → {u.endDate ?? u.date} · {u.type}
                    </div>
                    <p className="mt-1 text-muted-foreground">{u.summary}</p>
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

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const t = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  }[tone];
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${t}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
