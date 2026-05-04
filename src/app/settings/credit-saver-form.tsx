"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import { setCreditSaverEnabled } from "./key-actions";

export function CreditSaverForm({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(next: boolean) {
    setOn(next);
    setSaved(false);
    startTransition(async () => {
      await setCreditSaverEnabled(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card/40 p-4 backdrop-blur">
      <div className="flex items-start gap-3">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors ${
            on
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : "bg-violet-500/15 text-violet-300 ring-violet-500/30"
          }`}
        >
          {on ? (
            <PiggyBank className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Credit-saver mode</h3>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => toggle(!on)}
              disabled={pending}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                on ? "bg-emerald-500" : "bg-white/10"
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  on ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            When <strong className="text-foreground">on</strong>: every AI
            answer is capped at 500 tokens with a &ldquo;be terse&rdquo;
            instruction — perfect for free-tier providers (Gemini, Groq,
            OpenRouter free) where you want answers without burning your
            quota. When <strong className="text-foreground">off</strong>:
            full-quality long-form answers (executive summaries, blog drafts,
            content briefs) — uses up to 2000 tokens per call.
          </p>
          <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            <div className="rounded-md bg-white/[0.03] px-2 py-1.5 ring-1 ring-inset ring-white/[0.04]">
              <span className="font-mono font-medium text-foreground">ON</span>{" "}
              · ~500 tokens · 2-4 sentences · cheap rerolls
            </div>
            <div className="rounded-md bg-white/[0.03] px-2 py-1.5 ring-1 ring-inset ring-white/[0.04]">
              <span className="font-mono font-medium text-foreground">OFF</span>{" "}
              · up to 2000 tokens · full explanations, full briefs
            </div>
          </div>
          {pending && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </div>
          )}
          {saved && !pending && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
              <CheckCircle2 className="size-3" />
              Saved.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
