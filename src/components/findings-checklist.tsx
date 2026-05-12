"use client";

/**
 * Universal findings checklist. Every AI tool that persists findings
 * (SXO, GEO, AI site audit, E-E-A-T, schema check, …) shares this UI:
 *
 *   - One row per finding with checkbox + severity badge
 *   - Expandable "How to fix" with numbered steps + copyable snippet
 *   - Mark complete / Mark ignored
 *   - "Re-check this page" button appears once at least one is resolved
 *
 * Persistence is in the tool_findings table (migration 0048). The
 * mark-complete flow updates status + completedAt; the optional re-check
 * trigger calls back to a parent-provided handler so each tool can
 * implement its own re-run / score-delta logic.
 */

import { useState, useTransition } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Circle,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  markFindingStatus,
  type FindingStatus,
} from "@/lib/findings-actions";
import type { ToolFinding } from "@/db/schema";
import { cn } from "@/lib/utils";

type Props = {
  findings: ToolFinding[];
  /** Optional re-check handler — when provided, a "Re-check this page"
      button appears once at least one finding has been resolved. */
  onRecheck?: () => void | Promise<void>;
  /** Subject of the audit, shown in the header ("URL", "homepage", etc.) */
  subjectLabel?: string;
};

const SEV_BADGE: Record<string, string> = {
  critical: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  high: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  pass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

export function FindingsChecklist({
  findings: initial,
  onRecheck,
  subjectLabel,
}: Props) {
  const [findings, setFindings] = useState<ToolFinding[]>(initial);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [recheckBusy, setRecheckBusy] = useState(false);

  const open = findings.filter(
    (f) => f.status === "new" || f.status === "in_progress",
  );
  const resolved = findings.filter((f) => f.status === "resolved");
  const ignored = findings.filter((f) => f.status === "ignored");
  const total = findings.length;
  const completedCount = resolved.length + ignored.length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  async function setStatus(id: number, status: FindingStatus) {
    // Optimistic update
    setFindings((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status,
              completedAt: status === "resolved" ? new Date() : null,
            }
          : f,
      ),
    );
    startTransition(async () => {
      const r = await markFindingStatus(id, status);
      if (!r.ok) {
        toast.error("Couldn't update finding", { description: r.error });
        // Revert
        setFindings(initial);
      }
    });
  }

  async function runRecheck() {
    if (!onRecheck) return;
    setRecheckBusy(true);
    try {
      await onRecheck();
      toast.success("Re-check complete", {
        description: "Scores and findings updated.",
      });
    } catch (err) {
      toast.error("Re-check failed", {
        description: (err as Error).message,
      });
    } finally {
      setRecheckBusy(false);
    }
  }

  if (total === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-8 text-emerald-300" />
        <p className="mt-3 text-sm font-medium text-foreground">
          No findings — looking clean!
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This audit didn&apos;t turn up anything actionable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">
              {completedCount === total
                ? "All findings handled"
                : `${open.length} finding${open.length === 1 ? "" : "s"} open`}
              {subjectLabel && (
                <span className="ml-1 text-muted-foreground font-normal">
                  · {subjectLabel}
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {resolved.length} resolved · {ignored.length} ignored ·{" "}
              {open.length} remaining
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {percent}%
            </span>
            {onRecheck && completedCount > 0 && (
              <button
                type="button"
                onClick={runRecheck}
                disabled={recheckBusy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {recheckBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Re-check
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      {/* Findings list */}
      <ul className="space-y-2">
        {findings.map((f) => {
          const isExpanded = expandedId === f.id;
          const isResolved = f.status === "resolved";
          const isIgnored = f.status === "ignored";
          const muted = isResolved || isIgnored;
          return (
            <li
              key={f.id}
              className={cn(
                "rounded-lg border bg-card transition-colors",
                muted ? "border-border opacity-60" : "border-border",
              )}
            >
              <div className="flex items-start gap-3 p-3">
                <button
                  type="button"
                  onClick={() =>
                    setStatus(f.id, isResolved ? "new" : "resolved")
                  }
                  disabled={pending}
                  aria-label={isResolved ? "Reopen finding" : "Mark resolved"}
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition-colors",
                    isResolved
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  {isResolved ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : (
                    <Circle className="size-2.5 opacity-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                        SEV_BADGE[f.severity] ?? SEV_BADGE.medium,
                      )}
                    >
                      {f.severity === "critical" ||
                      f.severity === "high" ? (
                        <AlertTriangle className="size-2.5" />
                      ) : null}
                      {f.severity}
                    </span>
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        muted && "line-through",
                      )}
                    >
                      {f.title}
                    </span>
                    {isIgnored && (
                      <span className="text-[10px] text-muted-foreground">
                        ignored
                      </span>
                    )}
                  </div>
                  {f.details && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {f.details}
                    </p>
                  )}
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  {!isResolved && !isIgnored && (
                    <button
                      type="button"
                      onClick={() => setStatus(f.id, "ignored")}
                      disabled={pending}
                      title="Ignore (won't appear in re-checks)"
                      className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <EyeOff className="size-3.5" />
                    </button>
                  )}
                  {(isResolved || isIgnored) && (
                    <button
                      type="button"
                      onClick={() => setStatus(f.id, "new")}
                      disabled={pending}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Reopen
                    </button>
                  )}
                  <ChevronRight
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90",
                    )}
                  />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="space-y-3 p-4">
                      {f.fixSteps && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            How to fix
                          </h4>
                          <div className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">
                            {f.fixSteps}
                          </div>
                        </div>
                      )}
                      {f.codeSnippet && (
                        <CodeSnippet code={f.codeSnippet} />
                      )}
                      {!f.fixSteps && !f.codeSnippet && (
                        <p className="text-xs italic text-muted-foreground">
                          No fix steps recorded — the AI didn&apos;t generate
                          guidance for this finding. You can still mark it
                          done after addressing it manually.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Copy-paste fix
        </h4>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline"
        >
          <Copy className="size-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-foreground/90 ring-1 ring-inset ring-border">
        {code}
      </pre>
    </div>
  );
}
