"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  DollarSign,
  Image as ImageIcon,
  Layers,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { STAGE_META, type AdsFunnelResult } from "./actions";
import { findAdPlatform } from "@/lib/ads-skills";

const STAGE_COLOR: Record<keyof typeof STAGE_META, string> = {
  awareness: "border-violet-500/30 bg-violet-500/[0.04]",
  consideration: "border-cyan-500/30 bg-cyan-500/[0.04]",
  conversion: "border-emerald-500/30 bg-emerald-500/[0.04]",
  retention: "border-amber-500/30 bg-amber-500/[0.04]",
};

function copy(text: string, label = "Copied to clipboard") {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

export function AdsFunnelResultView({ result }: { result: AdsFunnelResult }) {
  return (
    <div className="space-y-5">
      {/* Strategy summary */}
      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Target className="size-4 text-rose-300" />
          Strategy
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {result.strategySummary}
        </p>
        <AiDisclaimer variant="inline" />
      </section>

      {/* Budget split */}
      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <DollarSign className="size-4 text-emerald-300" />
          Budget — {result.budgetTotal}
        </h2>
        <div className="mt-3 space-y-2">
          {result.budgetSplit.map((b) => {
            const meta = findAdPlatform(b.platformId);
            return (
              <div
                key={b.platformId}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-40 shrink-0">
                  {meta?.emoji} {meta?.name ?? b.platformId}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
                  <div
                    className="h-full bg-rose-500/40"
                    style={{ width: `${Math.min(100, b.share)}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right tabular-nums text-muted-foreground">
                  {b.share}% · {b.amount}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Funnel map */}
      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Layers className="size-4 text-violet-300" />
          Funnel map
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {result.funnelMap.map((f, i) => {
            const stage = STAGE_META[f.stage];
            return (
              <div
                key={i}
                className={`rounded-xl border p-3 ${STAGE_COLOR[f.stage]}`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <span>{stage.emoji}</span>
                  <span>{stage.label}</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {stage.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.platforms.map((p) => {
                    const meta = findAdPlatform(p);
                    return (
                      <span
                        key={p}
                        className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px]"
                      >
                        {meta?.emoji} {meta?.name ?? p}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs">
                  <span className="font-medium text-foreground/80">Offer:</span>{" "}
                  {f.whatToOffer}
                </div>
                <div className="mt-1 text-xs">
                  <span className="font-medium text-foreground/80">Measure:</span>{" "}
                  {f.successMetric}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-platform output */}
      {result.platforms.map((p) => (
        <PlatformCard key={p.platformId} platform={p} />
      ))}

      {/* Tracking + preflight */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="size-4 text-cyan-300" />
            Tracking playbook
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {result.trackingPlaybook.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CheckSquare className="size-4 text-amber-300" />
            Preflight checklist
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {result.preflightChecklist.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 size-3.5 shrink-0 text-amber-300/70" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
}: {
  platform: AdsFunnelResult["platforms"][number];
}) {
  const [open, setOpen] = useState(true);
  const meta = findAdPlatform(platform.platformId);
  const stage = STAGE_META[platform.funnelStage];

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 border-b border-white/[0.06] px-5 py-4 text-left hover:bg-white/[0.02]"
      >
        {open ? (
          <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <span>{meta?.emoji}</span>
            <span>{platform.platformName}</span>
            <span
              className={`ml-2 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${STAGE_COLOR[platform.funnelStage]}`}
            >
              {stage.emoji} {stage.label.split(" (")[0]}
            </span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {platform.rationale}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/80">
            Suggested budget: <strong>{platform.monthlyBudgetSuggestion}</strong>
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-5 p-5">
          {/* Copy variants */}
          {platform.copyVariants.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ad copy variants ({platform.copyVariants.length})
              </h4>
              <div className="mt-2 space-y-3">
                {platform.copyVariants.map((v, i) => (
                  <CopyVariant key={i} variant={v} index={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Image prompts */}
          {platform.imagePrompts.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="size-3.5" />
                Image-generation prompts ({platform.imagePrompts.length})
              </h4>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Paste any of these into MidJourney, DALL-E, Stable Diffusion,
                or a creative tool. Aspect ratio is encoded inline.
              </p>
              <ul className="mt-2 space-y-2">
                {platform.imagePrompts.map((p, i) => (
                  <li
                    key={i}
                    className="group relative rounded-md bg-black/30 px-3 py-2 pr-10 text-xs ring-1 ring-inset ring-white/5"
                  >
                    <code className="block font-mono leading-relaxed">{p}</code>
                    <button
                      type="button"
                      onClick={() => copy(p, "Prompt copied")}
                      title="Copy prompt"
                      className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded text-muted-foreground opacity-0 transition-all hover:bg-white/10 hover:text-foreground group-hover:opacity-100"
                    >
                      <Copy className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords — Google Search only */}
          {platform.keywords && (
            <div>
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ListChecks className="size-3.5" />
                Keyword bundle
              </h4>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KeywordGroup
                  title="Exact"
                  hint="Bracket: [keyword]"
                  items={platform.keywords.exact}
                  tone="emerald"
                />
                <KeywordGroup
                  title="Phrase"
                  hint={`Quote: "keyword phrase"`}
                  items={platform.keywords.phrase}
                  tone="cyan"
                />
                <KeywordGroup
                  title="Broad"
                  hint="No punctuation"
                  items={platform.keywords.broad}
                  tone="violet"
                />
                <KeywordGroup
                  title="Negatives"
                  hint="Block these"
                  items={platform.keywords.negatives}
                  tone="rose"
                />
              </div>
            </div>
          )}

          {/* Tracking + pitfalls */}
          {(platform.trackingNotes.length > 0 ||
            platform.pitfallsToAvoid.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {platform.trackingNotes.length > 0 && (
                <div className="rounded-md bg-cyan-500/[0.04] p-3 ring-1 ring-inset ring-cyan-500/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                    Tracking setup
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-foreground/85">
                    {platform.trackingNotes.map((n, i) => (
                      <li key={i}>· {n}</li>
                    ))}
                  </ul>
                </div>
              )}
              {platform.pitfallsToAvoid.length > 0 && (
                <div className="rounded-md bg-amber-500/[0.04] p-3 ring-1 ring-inset ring-amber-500/20">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    <AlertCircle className="size-3" />
                    Pitfalls to avoid
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-foreground/85">
                    {platform.pitfallsToAvoid.map((p, i) => (
                      <li key={i}>· {p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CopyVariant({
  variant,
  index,
}: {
  variant: AdsFunnelResult["platforms"][number]["copyVariants"][number];
  index: number;
}) {
  const allText = [
    variant.primaryText ? `Primary: ${variant.primaryText}` : "",
    variant.headlines.length > 0
      ? `Headlines:\n${variant.headlines.map((h) => `  • ${h}`).join("\n")}`
      : "",
    variant.descriptions && variant.descriptions.length > 0
      ? `Descriptions:\n${variant.descriptions.map((d) => `  • ${d}`).join("\n")}`
      : "",
    variant.cta ? `CTA: ${variant.cta}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="rounded-md bg-black/30 p-3 ring-1 ring-inset ring-white/5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Variant {index}
          {variant.cta && (
            <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-foreground">
              CTA: {variant.cta}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => copy(allText, `Variant ${index} copied`)}
          title="Copy this variant"
          className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <Copy className="size-3" />
        </button>
      </div>

      {variant.primaryText && (
        <div className="mt-2">
          <span className="text-[10px] text-muted-foreground">
            Primary ({variant.primaryText.length} chars)
          </span>
          <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">
            {variant.primaryText}
          </p>
        </div>
      )}
      {variant.headlines.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] text-muted-foreground">
            Headlines ({variant.headlines.length})
          </span>
          <ul className="mt-0.5 space-y-0.5">
            {variant.headlines.map((h, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="text-muted-foreground/60 tabular-nums">
                  {String(i + 1).padStart(2, " ")}.
                </span>
                <span className="flex-1">{h}</span>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                  {h.length}c
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {variant.descriptions && variant.descriptions.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] text-muted-foreground">
            Descriptions ({variant.descriptions.length})
          </span>
          <ul className="mt-0.5 space-y-0.5">
            {variant.descriptions.map((d, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="text-muted-foreground/60 tabular-nums">
                  {String(i + 1).padStart(2, " ")}.
                </span>
                <span className="flex-1">{d}</span>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                  {d.length}c
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {variant.notes && (
        <p className="mt-2 text-[11px] italic text-muted-foreground/80">
          {variant.notes}
        </p>
      )}
    </div>
  );
}

function KeywordGroup({
  title,
  hint,
  items,
  tone,
}: {
  title: string;
  hint: string;
  items: string[];
  tone: "emerald" | "cyan" | "violet" | "rose";
}) {
  const toneCls = {
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    rose: "text-rose-300",
  }[tone];
  return (
    <div className="rounded-md bg-white/[0.02] p-2.5 ring-1 ring-inset ring-white/5">
      <div className="flex items-center justify-between">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${toneCls}`}
        >
          {title} ({items.length})
        </p>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => copy(items.join("\n"), `${title} keywords copied`)}
            title={`Copy all ${title.toLowerCase()} keywords`}
            className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <Copy className="size-3" />
          </button>
        )}
      </div>
      <p className="text-[9px] text-muted-foreground/70">{hint}</p>
      <ul className="mt-1.5 space-y-0.5 text-xs">
        {items.length === 0 && (
          <li className="text-muted-foreground/60">—</li>
        )}
        {items.map((kw, i) => (
          <li key={i} className="truncate font-mono text-[11px]">
            {kw}
          </li>
        ))}
      </ul>
    </div>
  );
}
