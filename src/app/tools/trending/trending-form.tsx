"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Flame, Loader2, Sparkles } from "lucide-react";
import { runTrending, type TrendingState } from "./actions";

const FORMAT_TONE: Record<string, string> = {
  "how-to": "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  listicle: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  comparison: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  guide: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  definition: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  "case-study": "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  news: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  opinion: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
};

export function TrendingForm() {
  const [state, formAction, pending] = useActionState<
    TrendingState | null,
    FormData
  >(runTrending, null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copy(idx: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_120px_140px]">
          <input
            name="topic"
            required
            placeholder="vegan meal planning · serverless databases · pickleball"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <input
            name="country"
            defaultValue="US"
            maxLength={4}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm uppercase focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500/15 px-4 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Mining signals…
              </>
            ) : (
              <>
                <Flame className="mr-2 size-3" />
                Find ideas
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
          <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-amber-300" />
              Signal sources
            </h3>
            <div className="grid gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
              <SignalCard
                label="Trends rising"
                items={state.result.signals.trendsRising}
                tone="rose"
              />
              <SignalCard
                label="Trends top"
                items={state.result.signals.trendsTop}
                tone="amber"
              />
              <SignalCard
                label="Autocomplete"
                items={state.result.signals.autocomplete}
                tone="cyan"
              />
              <SignalCard
                label="People Also Ask"
                items={state.result.signals.paa}
                tone="violet"
              />
              <SignalCard
                label="Related searches"
                items={state.result.signals.related}
                tone="emerald"
              />
              <SignalCard
                label="Reddit"
                items={state.result.signals.reddit}
                tone="rose"
              />
            </div>
          </section>

          {state.result.ideas.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <header className="border-b border-white/[0.06] px-5 py-4">
                <h2 className="text-base font-semibold">
                  {state.result.ideas.length} content ideas
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ranked roughly by signal strength × novelty.
                </p>
              </header>
              <ul className="divide-y divide-white/[0.05]">
                {state.result.ideas.map((idea, i) => (
                  <li key={i} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{idea.title}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ring-1 ring-inset ${FORMAT_TONE[idea.format] ?? "bg-white/5 text-muted-foreground ring-white/10"}`}
                          >
                            {idea.format}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {idea.rationale}
                        </p>
                        {idea.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {idea.sources.map((s) => (
                              <span
                                key={s}
                                className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {s.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(i, idea.title)}
                        className="inline-flex h-7 shrink-0 items-center rounded-md bg-white/5 px-2 text-[11px] text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-foreground"
                      >
                        {copiedIdx === i ? (
                          <>
                            <Check className="mr-1 size-3 text-emerald-300" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 size-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
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

function SignalCard({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "amber" | "cyan" | "violet" | "emerald" | "rose";
}) {
  const t = {
    amber: "ring-amber-500/30",
    cyan: "ring-cyan-500/30",
    violet: "ring-violet-500/30",
    emerald: "ring-emerald-500/30",
    rose: "ring-rose-500/30",
  }[tone];
  return (
    <div className={`rounded-lg bg-white/[0.02] p-3 ring-1 ring-inset ${t}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted-foreground/70">none</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {items.slice(0, 6).map((s) => (
            <li key={s} className="truncate text-[11px]">
              {s}
            </li>
          ))}
          {items.length > 6 && (
            <li className="text-[10px] text-muted-foreground">
              + {items.length - 6} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
