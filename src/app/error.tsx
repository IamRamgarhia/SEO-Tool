"use client";

/**
 * Page-level error boundary. Next.js calls this whenever any server- or
 * client-rendered component inside a route throws. We:
 *
 *   - Show a friendly explanation (not a stack trace)
 *   - Offer concrete recovery options: Try again, Restart server, Copy
 *     details for an issue, Go home
 *   - Auto-log the error to /api/log-error so the user's error log
 *     captures it (fire-and-forget; failure is silent)
 *   - Show stack only behind a disclosure for power users
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Copy,
  Home,
  RefreshCw,
} from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Best-effort server-side log so it appears in the error log. If the
    // log endpoint itself is broken, swallow — we don't want errors-in-
    // the-error-handler.
    fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: "page-error-boundary",
        url: typeof window !== "undefined" ? location.href : null,
        digest: error.digest ?? null,
      }),
    }).catch(() => undefined);
  }, [error]);

  async function copyDetails() {
    const text = [
      `Error: ${error.message}`,
      error.digest ? `Digest: ${error.digest}` : "",
      `URL: ${typeof window !== "undefined" ? location.href : "n/a"}`,
      "",
      "Stack:",
      error.stack ?? "(no stack)",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — old browsers may not support clipboard
    }
  }

  async function restart() {
    if (
      !confirm(
        "Restart the server? The page will reload itself once the server is back (8–15 s).",
      )
    )
      return;
    try {
      await fetch("/api/restart", { method: "POST" });
      // Poll for the server, then reload
      setTimeout(function poll() {
        fetch("/api/health-ping", { cache: "no-store" })
          .then(() => location.reload())
          .catch(() => setTimeout(poll, 1500));
      }, 3000);
    } catch {
      // best-effort
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center space-y-5 py-12">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300">
          <AlertTriangle className="size-3" />
          Something went wrong on this page
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Don&apos;t worry — your data is safe.
        </h1>
        <p className="text-[14px] text-muted-foreground">
          The page crashed while rendering. Below are a few things that almost
          always fix it. The error has been logged so you can review it later
          under{" "}
          <Link href="/settings/errors" className="text-violet-300 hover:underline">
            Settings → Error log
          </Link>
          .
        </p>
      </div>

      {/* Quick error summary */}
      <div className="rounded-md border border-border bg-card px-3 py-2 font-mono text-[12px] text-foreground/90">
        {error.message || "Unknown error"}
      </div>

      {/* Recovery actions */}
      <div className="space-y-2">
        <h2 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          Try one of these
        </h2>
        <div className="space-y-1.5">
          <RecoveryButton
            icon={RefreshCw}
            title="Try this page again"
            detail="Re-runs the request — fixes 80% of transient errors."
            onClick={() => reset()}
            primary
          />
          <RecoveryButton
            icon={ArrowLeft}
            title="Go back"
            detail="Return to the previous page."
            onClick={() => history.back()}
          />
          <RecoveryButton
            icon={Home}
            title="Go to dashboard"
            detail="Fresh start from a known-good page."
            href="/"
          />
          <RecoveryButton
            icon={RefreshCw}
            title="Restart the server"
            detail="If the error keeps repeating after retry. ~10 seconds."
            onClick={restart}
          />
        </div>
      </div>

      {/* Power-user details */}
      <details
        open={details}
        onToggle={(e) => setDetails((e.target as HTMLDetailsElement).open)}
        className="rounded-md border border-border bg-muted/20"
      >
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronRight
            className={`size-3 transition-transform ${details ? "rotate-90" : ""}`}
          />
          Technical details
          {error.digest && (
            <code className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              #{error.digest}
            </code>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              copyDetails();
            }}
            className="ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Copy className="size-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        </summary>
        {details && (
          <pre className="overflow-x-auto border-t border-border bg-background/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {error.stack ?? "(no stack trace)"}
          </pre>
        )}
      </details>
    </div>
  );
}

function RecoveryButton({
  icon: Icon,
  title,
  detail,
  onClick,
  href,
  primary,
}: {
  icon: typeof Home;
  title: string;
  detail: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
}) {
  const className = `group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
    primary
      ? "border-primary/40 bg-primary/10 hover:bg-primary/20"
      : "border-border bg-card hover:bg-accent"
  }`;
  const inner = (
    <>
      <Icon
        className={`size-4 shrink-0 ${primary ? "text-primary" : "text-muted-foreground"}`}
      />
      <div className="flex-1">
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{detail}</div>
      </div>
      <ChevronRight
        className={`size-3 ${primary ? "text-primary" : "text-muted-foreground/60"} transition-transform group-hover:translate-x-0.5`}
      />
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
