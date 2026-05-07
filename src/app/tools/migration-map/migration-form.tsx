"use client";

import { useActionState, useState } from "react";
import { Check, Copy, GitMerge, Loader2 } from "lucide-react";
import { runMapping, type MigrationState } from "./actions";

export function MigrationForm() {
  const [state, formAction, pending] = useActionState<
    MigrationState | null,
    FormData
  >(runMapping, null);
  const [tab, setTab] = useState<"nginx" | "apache" | "nextjs" | "table">("nginx");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Old URLs (1 per line)</span>
            <textarea
              name="oldUrls"
              required
              rows={10}
              spellCheck={false}
              placeholder={"https://oldsite.com/blog/old-post\nhttps://oldsite.com/about-us\nhttps://oldsite.com/products/widget"}
              className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-[11px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">New URLs (1 per line)</span>
            <textarea
              name="newUrls"
              required
              rows={10}
              spellCheck={false}
              placeholder={"https://newsite.com/blog/new-post\nhttps://newsite.com/about\nhttps://newsite.com/shop/widget"}
              className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-[11px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-amber-500/15 px-5 text-sm font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Matching URLs…
            </>
          ) : (
            <>
              <GitMerge className="mr-2 size-4" />
              Generate redirect map
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
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Old URLs" value={state.map.summary.total.toString()} />
            <Stat label="High confidence" value={state.map.summary.matched.toString()} hint="≥85%" tone="emerald" />
            <Stat label="Needs review" value={state.map.summary.review.toString()} hint="50-85%" tone="amber" />
            <Stat
              label="Avg confidence"
              value={`${(state.map.summary.avgConfidence * 100).toFixed(0)}%`}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-white/[0.06]">
            {(["table", "nginx", "apache", "nextjs"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === t
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "table" && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Old URL</th>
                      <th className="px-4 py-2 text-left">→ New URL</th>
                      <th className="px-4 py-2 text-right">Conf.</th>
                      <th className="px-4 py-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.map.rows.map((r, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-4 py-1.5 font-mono">{r.oldUrl}</td>
                        <td className="px-4 py-1.5 font-mono">
                          {r.newUrl ?? <span className="text-rose-300">— (review)</span>}
                        </td>
                        <td className={`px-4 py-1.5 text-right tabular-nums ${
                          r.confidence >= 0.85
                            ? "text-emerald-300"
                            : r.confidence >= 0.5
                              ? "text-amber-300"
                              : "text-rose-300"
                        }`}>
                          {(r.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-1.5 text-muted-foreground">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "nginx" && (
            <CopyBlock
              label="nginx"
              code={state.output.nginx || "(no rows)"}
              copied={copied === "nginx"}
              onCopy={() => copy("nginx", state.output.nginx)}
            />
          )}
          {tab === "apache" && (
            <CopyBlock
              label="apache"
              code={state.output.apache || "(no rows)"}
              copied={copied === "apache"}
              onCopy={() => copy("apache", state.output.apache)}
            />
          )}
          {tab === "nextjs" && (
            <CopyBlock
              label="nextjs"
              code={state.output.nextjs || "(no rows)"}
              copied={copied === "nextjs"}
              onCopy={() => copy("nextjs", state.output.nextjs)}
            />
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
  tone?: "emerald" | "amber" | "rose";
}) {
  const t = tone
    ? { emerald: "text-emerald-300", amber: "text-amber-300", rose: "text-rose-300" }[tone]
    : "";
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

function CopyBlock({
  label,
  code,
  copied,
  onCopy,
}: {
  label: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <span className="text-sm font-semibold">{label}</span>
        <button
          type="button"
          onClick={onCopy}
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
      <pre className="max-h-[500px] overflow-auto p-4 font-mono text-[11px] leading-relaxed">
        {code}
      </pre>
    </section>
  );
}
