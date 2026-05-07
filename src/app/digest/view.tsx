"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { WeeklyDigest } from "@/lib/weekly-digest";

export function DigestView({ digest }: { digest: WeeklyDigest }) {
  const [tab, setTab] = useState<"summary" | "text" | "html">("summary");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <Stat label="Period" value={`${digest.weekStart} → ${digest.weekEnd}`} />
        <Stat label="Audits" value={digest.totals.auditsRun.toString()} />
        <Stat label="Tasks shipped" value={digest.totals.tasksDone.toString()} tone="emerald" />
        <Stat label="Improved" value={digest.totals.clientsImproved.toString()} tone="emerald" />
        <Stat label="Dropped" value={digest.totals.clientsDropped.toString()} tone={digest.totals.clientsDropped > 0 ? "rose" : "emerald"} />
      </div>

      {digest.algoOverlaps.length > 0 && (
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold">Algorithm updates this week</h3>
          <ul className="space-y-1 text-xs">
            {digest.algoOverlaps.map((u) => (
              <li
                key={u.name}
                className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-300 ring-1 ring-inset ring-amber-500/30"
              >
                {u.name} <span className="text-muted-foreground">({u.type})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/[0.06]">
        {(["summary", "text", "html"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "summary" ? "Per-client" : t === "text" ? "Plain text" : "HTML email"}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <section className="glass-apple relative overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right">Δ</th>
                  <th className="px-4 py-2 text-right">Tasks</th>
                  <th className="px-4 py-2 text-left">Wins</th>
                  <th className="px-4 py-2 text-left">Concerns</th>
                </tr>
              </thead>
              <tbody>
                {digest.rows.map((r) => (
                  <tr key={r.clientId} className="border-t border-white/[0.04]">
                    <td className="px-4 py-1.5 font-medium">{r.clientName}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">
                      {r.scoreLatest ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-1.5 text-right tabular-nums ${
                        r.scoreDelta === null
                          ? "text-muted-foreground"
                          : r.scoreDelta > 0
                            ? "text-emerald-300"
                            : r.scoreDelta < 0
                              ? "text-rose-300"
                              : "text-muted-foreground"
                      }`}
                    >
                      {r.scoreDelta !== null
                        ? `${r.scoreDelta > 0 ? "+" : ""}${r.scoreDelta}`
                        : "—"}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-muted-foreground">
                      {r.tasksDoneThisWeek}
                    </td>
                    <td className="px-4 py-1.5 text-emerald-300">
                      {r.highlight && `✓ ${r.highlight}`}
                    </td>
                    <td className="px-4 py-1.5 text-amber-300">{r.concern}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "text" && (
        <CopyBlock
          label="Plain text"
          code={digest.textVersion}
          copied={copied === "text"}
          onCopy={() => copy("text", digest.textVersion)}
        />
      )}
      {tab === "html" && (
        <CopyBlock
          label="HTML email"
          code={digest.htmlVersion}
          copied={copied === "html"}
          onCopy={() => copy("html", digest.htmlVersion)}
        />
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
  const t = tone
    ? { emerald: "text-emerald-300", amber: "text-amber-300", rose: "text-rose-300" }[tone]
    : "";
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-base font-semibold tabular-nums ${t}`}>
        {value}
      </div>
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
