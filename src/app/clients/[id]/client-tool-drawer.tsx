"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";

/**
 * Slide-over drawer that loads a tool URL in an iframe so the user
 * never leaves the client canvas. The tool URL is loaded with
 * `?embed=1` appended — the EmbedModeToggle component on the global
 * layout reads that param and hides the duplicate shell chrome.
 *
 * Keyboard:
 *   Esc      → close
 * Click on backdrop also closes.
 *
 * The drawer is portal-rendered to <body> via fixed positioning so it
 * sits above everything regardless of where it's mounted in the tree.
 */
export function ClientToolDrawer({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [wide, setWide] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Append `?embed=1` to the URL so the embedded page hides its shell
  const embedUrl = appendEmbed(url);
  const standaloneUrl = stripEmbed(url);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function reload() {
    if (iframeRef.current) {
      // Re-assign src to force a reload; toggling loading state again.
      setLoading(true);
      iframeRef.current.src = embedUrl;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={`Tool: ${title}`}
    >
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`flex h-full flex-col border-l border-border bg-background shadow-2xl transition-[width] ${
          wide ? "w-[95vw]" : "w-[75vw]"
        }`}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card/80 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            <p className="truncate text-[10px] text-muted-foreground">
              {standaloneUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            title="Reload"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setWide((v) => !v)}
            title={wide ? "Shrink drawer" : "Expand to almost full screen"}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {wide ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </button>
          <a
            href={standaloneUrl}
            target="_blank"
            rel="noreferrer noopener"
            title="Open in a new tab (full-page view)"
            className="inline-flex h-8 items-center gap-1 rounded-md bg-white/5 px-2.5 text-[11px] text-muted-foreground ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            New tab
          </a>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="relative flex-1 overflow-hidden bg-background">
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-xs ring-1 ring-inset ring-border">
                <Loader2 className="size-3.5 animate-spin text-violet-300" />
                Loading tool…
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            onLoad={() => setLoading(false)}
            className="size-full border-0"
            // Same-origin only — tools live in our own app so cookies +
            // server actions work seamlessly.
          />
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-border bg-card/40 px-4 py-1.5 text-[10px] text-muted-foreground">
          <span>
            Tool runs in this drawer — the client context (left sidebar) stays
            put.
          </span>
          <a
            href={standaloneUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-0.5 hover:text-foreground"
          >
            Standalone view <ArrowUpRight className="size-2.5" />
          </a>
        </footer>
      </div>
    </div>
  );
}

function appendEmbed(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  if (url.includes("embed=1")) return url;
  return `${url}${sep}embed=1`;
}

function stripEmbed(url: string): string {
  return url
    .replace(/[?&]embed=1(&|$)/, (_m, after) => (after === "&" ? "?" : ""))
    .replace(/[?&]$/, "");
}
