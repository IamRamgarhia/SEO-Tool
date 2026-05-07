"use client";

import { useActionState } from "react";
import { Loader2, Network, TrendingDown, TrendingUp } from "lucide-react";
import { runPagerank, type PrState } from "./actions";

export function PagerankForm() {
  const [state, formAction, pending] = useActionState<PrState | null, FormData>(
    runPagerank,
    null,
  );

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_140px_140px]">
          <input
            name="startUrl"
            required
            placeholder="https://yoursite.com"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Max pages</span>
            <input
              name="maxPages"
              type="number"
              defaultValue={150}
              min={20}
              max={300}
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-violet-500/15 px-4 text-xs font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Crawling + computing…
              </>
            ) : (
              <>
                <Network className="mr-2 size-3" />
                Simulate
              </>
            )}
          </button>
        </div>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Pages crawled" value={state.result.totalPages.toString()} />
            <Stat label="Internal links" value={state.result.totalLinks.toString()} />
            <Stat label="Iterations" value={`${state.result.iterations} (d=${state.result.damping})`} />
          </div>

          <Section
            title="Authority hubs"
            icon={<TrendingUp className="size-4 text-emerald-300" />}
            note="Pages with the highest computed PageRank — these power the rest of your site."
            rows={state.result.hubs}
            tone="emerald"
          />

          <Section
            title="Starved pages"
            icon={<TrendingDown className="size-4 text-rose-300" />}
            note="Bottom-PR pages with ≤1 inbound link. Add internal links to these from your hubs."
            rows={state.result.starved}
            tone="rose"
          />
        </>
      )}
    </>
  );
}

function Section({
  title,
  icon,
  note,
  rows,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  note: string;
  rows: import("@/lib/pagerank").PageRankRow[];
  tone: "emerald" | "rose";
}) {
  if (rows.length === 0) return null;
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title} ({rows.length})
        </h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{note}</p>
      </header>
      <ul className="divide-y divide-white/[0.05]">
        {rows.map((r) => (
          <li
            key={r.url}
            className="flex items-center justify-between gap-3 px-5 py-1.5 text-xs"
          >
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate hover:underline"
              title={r.title}
            >
              {r.title}
            </a>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              in {r.inbound} · out {r.outbound} ·{" "}
              <span className={tone === "emerald" ? "text-emerald-300" : "text-rose-300"}>
                {r.pagerankPct.toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
