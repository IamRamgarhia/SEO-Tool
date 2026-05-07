"use client";

import { useActionState, useState } from "react";
import { Check, Code2, Copy, Loader2, Sparkles } from "lucide-react";
import { runAiSchema, type AiSchemaState } from "./actions";

export function AiSchemaForm() {
  const [state, formAction, pending] = useActionState<
    AiSchemaState | null,
    FormData
  >(runAiSchema, null);
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
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <input
            name="url"
            required
            placeholder="https://yoursite.com/blog/post"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-3" />
                Generate
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

      {state?.ok && state.result.ok && state.result.suggestions.length === 0 && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/30">
          The page doesn&apos;t fit any rich-result schema type. AI returned no
          suggestions.
        </p>
      )}

      {state?.ok &&
        state.result.ok &&
        state.result.suggestions.map((s, i) => (
          <section
            key={i}
            className="glass-apple relative overflow-hidden rounded-2xl"
          >
            <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <Code2 className="size-4 text-cyan-300" />
                <span className="text-sm font-semibold">{s.type}</span>
              </div>
              <button
                type="button"
                onClick={() => copy(i, s.jsonLd)}
                className="inline-flex h-7 items-center rounded-md bg-white/5 px-2 text-[11px] text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-foreground"
              >
                {copiedIdx === i ? (
                  <>
                    <Check className="mr-1 size-3 text-emerald-300" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 size-3" />
                    Copy JSON-LD
                  </>
                )}
              </button>
            </header>
            <div className="space-y-3 p-5">
              <p className="text-xs text-muted-foreground">{s.rationale}</p>
              <pre className="max-h-[400px] overflow-auto rounded-md bg-black/40 p-3 font-mono text-[11px] leading-relaxed">
                {s.jsonLd}
              </pre>
              <p className="text-[10px] text-muted-foreground">
                Paste this inside a{" "}
                <code className="rounded bg-white/5 px-1 py-0.5">
                  &lt;script type=&quot;application/ld+json&quot;&gt;
                </code>{" "}
                tag in your &lt;head&gt;. Always validate in Google&apos;s Rich
                Results Test before shipping.
              </p>
            </div>
          </section>
        ))}
    </>
  );
}
