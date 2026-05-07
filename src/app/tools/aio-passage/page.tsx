"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  analyzePassages,
  suggestRewrite,
  type AnalyzeState,
} from "./actions";
import type { PassageScore } from "@/lib/aio-passage-scorer";
import { AiDisclaimer } from "@/components/ai-disclaimer";

const SAMPLE = `# How INP affects SEO in 2026

Interaction to Next Paint (INP) measures how quickly your page responds to user input. A good INP is under 200 milliseconds — that's the threshold Google uses for the Core Web Vitals ranking signal as of March 2024.

INP replaced First Input Delay because FID only measured the very first interaction, while real users tap, scroll, and type continuously. Pages that feel laggy on the second tap can have a perfect FID but a failing INP.

To improve INP, break up long JavaScript tasks. Yield to the main thread every 50ms using setTimeout or scheduler.yield. Move heavy work into a Web Worker. Defer non-critical scripts to load after first paint.

Real-world INP comes from CrUX. Lab tests like Lighthouse can flag slow scripts but won't reproduce the field signal. Watch the Search Console Core Web Vitals report for the 28-day origin-level numbers Google actually uses.`;

export default function AioPassagePage() {
  const [state, formAction, pending] = useActionState<AnalyzeState, FormData>(
    analyzePassages,
    null,
  );
  const [markdown, setMarkdown] = useState(SAMPLE);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        All tools
      </Link>

      <PageHeader
        title="AI Overview passage optimizer"
        description="Research shows AIs preferentially cite 134-167 word self-contained passages. Paste a draft — we split it into chunks, score each on length, self-containment, Q→A structure, factual concreteness, and source citation."
        icon={Sparkles}
        accent="violet"
      />

      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl space-y-3 p-5"
      >
        <textarea
          name="markdown"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          rows={14}
          placeholder="Paste your blog post markdown here…"
          className="w-full rounded-md border border-white/10 bg-card/60 p-3 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !markdown.trim()}
            className="inline-flex h-10 items-center rounded-md bg-violet-500/15 px-5 text-sm font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Scoring…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Score passages
              </>
            )}
          </button>
          <span className="text-[11px] text-muted-foreground">
            Deterministic scoring — no AI cost. AI rewrite hints are optional
            per passage.
          </span>
        </div>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && <Results passages={state.passages} />}
    </div>
  );
}

function Results({ passages }: { passages: PassageScore[] }) {
  const avg =
    passages.reduce((s, p) => s + p.score, 0) / Math.max(1, passages.length);
  const cited = passages.filter((p) => p.score >= 70).length;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Passages found"
          value={passages.length}
          tone="white"
        />
        <Stat
          label="Cite-ready (≥70)"
          value={`${cited}/${passages.length}`}
          tone={cited === passages.length ? "emerald" : cited > 0 ? "amber" : "rose"}
        />
        <Stat
          label="Avg score"
          value={Math.round(avg)}
          tone={avg >= 70 ? "emerald" : avg >= 50 ? "amber" : "rose"}
        />
      </div>
      {passages.map((p) => (
        <PassageRow key={p.index} passage={p} />
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "white" | "emerald" | "amber" | "rose";
}) {
  const t = {
    white: "text-foreground",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  }[tone];
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${t}`}>
        {value}
      </div>
    </div>
  );
}

function PassageRow({ passage }: { passage: PassageScore }) {
  const [open, setOpen] = useState(passage.score < 70);
  const [pending, startTransition] = useTransition();
  const [rewrite, setRewrite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tone =
    passage.score >= 80
      ? "border-emerald-500/30 bg-emerald-500/5"
      : passage.score >= 60
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-rose-500/30 bg-rose-500/5";

  return (
    <section
      className={`rounded-2xl border p-4 ${tone}`}
    >
      <header className="flex flex-wrap items-center gap-3">
        <div
          className={`grid h-10 w-12 place-items-center rounded-lg text-sm font-bold tabular-nums ring-1 ring-inset ${
            passage.score >= 80
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : passage.score >= 60
                ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                : "bg-rose-500/15 text-rose-300 ring-rose-500/30"
          }`}
        >
          {passage.score}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs text-muted-foreground">
            Passage {passage.index + 1} · {passage.wordCount} words
          </p>
          <p className="line-clamp-1 text-sm">{passage.text.slice(0, 140)}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10"
          aria-label="Toggle"
        >
          {open ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </header>

      {open && (
        <div className="mt-3 space-y-3">
          <pre className="whitespace-pre-wrap rounded-md bg-black/30 p-3 text-[12px] leading-relaxed">
            {passage.text}
          </pre>
          <div className="grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-5">
            <CritRow label="Length" data={passage.criteria.length} />
            <CritRow label="Self-contained" data={passage.criteria.selfContained} />
            <CritRow label="Q→A structure" data={passage.criteria.answersAQuestion} />
            <CritRow label="Specifics" data={passage.criteria.factualConcreteness} />
            <CritRow label="Citation" data={passage.criteria.citesSource} />
          </div>

          {passage.score < 70 && (
            <div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setRewrite(null);
                  startTransition(async () => {
                    const r = await suggestRewrite(passage.text, passage.score);
                    if (r.ok) setRewrite(r.rewrite);
                    else setError(r.error);
                  });
                }}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-500/15 px-3 text-[11px] font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Wand2 className="size-3" />
                )}
                AI rewrite this passage
              </button>
              {error && (
                <p className="mt-2 text-[11px] text-rose-300">{error}</p>
              )}
              {rewrite && (
                <div className="mt-3 space-y-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-[12px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                    Suggested rewrite
                  </p>
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                    {rewrite}
                  </pre>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(rewrite)}
                      className="text-[11px] text-emerald-300 hover:underline"
                    >
                      Copy rewrite
                    </button>
                    <AiDisclaimer variant="inline" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CritRow({
  label,
  data,
}: {
  label: string;
  data: { score: number; note: string };
}) {
  const tone =
    data.score >= 80
      ? "text-emerald-300"
      : data.score >= 60
        ? "text-amber-300"
        : "text-rose-300";
  return (
    <div className="rounded-md bg-black/20 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`font-semibold tabular-nums ${tone}`}>
          {data.score}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{data.note}</p>
    </div>
  );
}
