"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

type Status =
  | {
      ok: true;
      local: string | null;
      remote: string | null;
      updateAvailable: boolean;
      diffUrl: string;
    }
  | { ok: false; error: string }
  | null;

export function UpdateCard() {
  const [status, setStatus] = useState<Status>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setUpdateResult(null);
    setUpdateError(null);
    try {
      const res = await fetch("/api/update", { cache: "no-store" });
      const j = await res.json();
      setStatus(j);
    } catch (err) {
      setStatus({
        ok: false,
        error: (err as Error).message || "Couldn't reach update endpoint",
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const update = useCallback(async () => {
    setUpdating(true);
    setUpdateResult(null);
    setUpdateError(null);
    try {
      const res = await fetch("/api/update", { method: "POST" });
      const j = await res.json();
      if (j.ok) {
        setUpdateResult(j.message || "Update applied. Restart the server to load the new code.");
      } else {
        setUpdateError(j.error || "Update failed");
      }
    } catch (err) {
      setUpdateError((err as Error).message || "Update request failed");
    } finally {
      setUpdating(false);
      void check();
    }
  }, [check]);

  return (
    <section id="update" className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Updates</h3>
          <p className="text-[11px] text-muted-foreground">
            One-click update from the GitHub `main` branch. Your data.db and
            .env.local are preserved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void check()}
          disabled={checking}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-white/5 px-2 text-xs text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 disabled:opacity-50"
        >
          {checking ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          Re-check
        </button>
      </header>

      {!status && (
        <p className="text-[11px] text-muted-foreground">Checking…</p>
      )}

      {status && !status.ok && (
        <p className="flex items-start gap-1 rounded-md bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30">
          <AlertCircle className="size-3 shrink-0 mt-0.5" />
          {status.error}
        </p>
      )}

      {status?.ok && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-md bg-white/[0.03] p-2 ring-1 ring-inset ring-white/5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Installed version
              </p>
              <p className="font-mono">{status.local ?? "unknown"}</p>
            </div>
            <div className="rounded-md bg-white/[0.03] p-2 ring-1 ring-inset ring-white/5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Latest on GitHub
              </p>
              <p className="font-mono">{status.remote ?? "unknown"}</p>
            </div>
          </div>

          {status.updateAvailable ? (
            <div className="rounded-md bg-amber-500/10 p-3 ring-1 ring-inset ring-amber-500/30 space-y-2">
              <p className="text-xs font-medium text-amber-300">
                Update available
              </p>
              <p className="text-[11px] text-muted-foreground">
                A newer commit is on GitHub. Click below to pull it; your
                local data is unchanged.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void update()}
                  disabled={updating}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-500/15 px-3 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <Download className="size-3" />
                      Update now
                    </>
                  )}
                </button>
                <a
                  href={status.diffUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline"
                >
                  See changelog on GitHub
                  <ExternalLink className="size-2.5" />
                </a>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <CheckCircle2 className="size-3" />
              You're on the latest version.
            </p>
          )}

          {updateResult && (
            <div className="rounded-md bg-emerald-500/10 p-3 text-[11px] text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              {updateResult}
            </div>
          )}
          {updateError && (
            <div className="rounded-md bg-rose-500/10 p-3 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30">
              {updateError}
            </div>
          )}
        </>
      )}
    </section>
  );
}
