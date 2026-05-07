"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Loader2, ShieldAlert } from "lucide-react";
import { runDisavow, type DisavowState } from "./actions";

export function DisavowForm() {
  const [state, formAction, pending] = useActionState<
    DisavowState | null,
    FormData
  >(runDisavow, null);
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">
            Backlinks — URL or domain per line, optional TAB+anchor
          </span>
          <textarea
            name="backlinks"
            required
            rows={10}
            spellCheck={false}
            placeholder={"https://spammy-site.tk/some-post\trandom anchor\nweird-domain.xyz\nlegitimate-blog.com/article\tactual anchor"}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <div className="flex items-end gap-3">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Mode</span>
            <select
              name="mode"
              defaultValue="auto"
              className="h-9 w-56 rounded-md border border-white/10 bg-card/60 px-3 text-sm"
            >
              <option value="auto">Only auto-flagged toxic domains</option>
              <option value="all">Disavow ALL pasted domains</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center rounded-md bg-rose-500/15 px-4 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <ShieldAlert className="mr-2 size-3" />
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

      {state?.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Backlinks parsed" value={state.stats.total.toString()} />
            <Stat label="Auto-flagged toxic" value={state.stats.toxic.toString()} tone="rose" />
            <Stat label="Needs review" value={state.stats.reviewed.toString()} tone="amber" />
          </div>

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <span className="text-sm font-semibold">disavow.txt</span>
              <button
                type="button"
                onClick={() => copy(state.output)}
                className="inline-flex h-7 items-center rounded-md bg-white/5 px-2 text-[11px] text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-foreground"
              >
                {copied ? (
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
            </header>
            <pre className="max-h-[400px] overflow-auto p-4 font-mono text-[11px] leading-relaxed">
              {state.output}
            </pre>
          </section>

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-3">
              <h3 className="text-sm font-semibold">Per-link review</h3>
            </header>
            <ul className="divide-y divide-white/[0.04]">
              {state.rows.map((r, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-1.5 text-xs">
                  <code className="truncate">{r.raw}</code>
                  <span className="text-muted-foreground">{r.reason}</span>
                  <span className={r.toxic ? "text-rose-300" : "text-amber-300"}>
                    {r.toxic ? "toxic" : "review"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const t = tone ? { emerald: "text-emerald-300", amber: "text-amber-300", rose: "text-rose-300" }[tone] : "";
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${t}`}>{value}</div>
    </div>
  );
}
