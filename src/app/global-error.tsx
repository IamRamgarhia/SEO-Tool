"use client";

/**
 * Root-level error boundary. Fires only when even the root layout fails
 * to render — that bypasses error.tsx. Must render its own <html> and
 * <body>; no Tailwind tokens here since the root CSS may not be loaded.
 *
 * Kept minimal: brief recovery options and a copy-error button. Most
 * users will never see this. When they do, the regular error boundary
 * already proved insufficient, so we keep this dead-simple.
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: "global-error-boundary",
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
      error.stack ?? "(no stack)",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          backgroundColor: "#0d0e10",
          color: "#e6e7ea",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 560, margin: "10vh auto" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 500,
              color: "#fca5a5",
              backgroundColor: "rgba(244,63,94,0.1)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: 6,
            }}
          >
            Critical error — root layout couldn&apos;t load
          </div>
          <h1
            style={{
              marginTop: 12,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Something went badly wrong.
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#a1a1aa",
              lineHeight: 1.55,
            }}
          >
            The app&apos;s root failed to render — usually means a freshly
            broken build or a missing dependency after an update. Try the
            options below in order.
          </p>

          <pre
            style={{
              marginTop: 16,
              padding: 10,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              color: "#d4d4d8",
              background: "#18191c",
              border: "1px solid #2a2b2f",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message || "Unknown error"}
          </pre>

          <ol
            style={{
              marginTop: 20,
              paddingLeft: 22,
              fontSize: 13,
              lineHeight: 1.7,
              color: "#d4d4d8",
            }}
          >
            <li>Try again — sometimes it&apos;s transient.</li>
            <li>
              Reload the page (
              <kbd
                style={{
                  fontFamily: "monospace",
                  background: "#26272b",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                Ctrl/Cmd + R
              </kbd>
              ).
            </li>
            <li>
              Stop the dev server (Ctrl+C in your terminal) and run{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  background: "#26272b",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                pnpm install
              </code>{" "}
              then{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  background: "#26272b",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                pnpm dev
              </code>{" "}
              — fixes missing-dependency errors after an update.
            </li>
            <li>
              Open an issue with the copied details below — that gives the
              maintainer enough to fix it fast.
            </li>
          </ol>

          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                background: "#5e6ad2",
                border: "1px solid #6e7adc",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => location.reload()}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                color: "#e6e7ea",
                background: "#18191c",
                border: "1px solid #2a2b2f",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Hard reload
            </button>
            <button
              type="button"
              onClick={copyDetails}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                color: "#a1a1aa",
                background: "transparent",
                border: "1px solid #2a2b2f",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Copy details
            </button>
          </div>

          {error.digest && (
            <div
              style={{ marginTop: 18, fontSize: 11, color: "#71717a" }}
            >
              Error ID: <code style={{ fontFamily: "monospace" }}>{error.digest}</code>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
