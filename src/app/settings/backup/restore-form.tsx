"use client";

import { useState } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import { confirmDialog } from "@/components/ui/confirm-dialog";

export function RestoreForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<
    | null
    | { ok: true; message: string; bytes: number }
    | { ok: false; error: string }
  >(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement)
      ?.files?.[0];
    if (!file) {
      setResult({ ok: false, error: "Pick a .db file first." });
      return;
    }
    const ok = await confirmDialog({
      title: `Replace data.db with ${file.name}?`,
      description: `Uploading ${(file.size / 1024 / 1024).toFixed(2)} MB. Your existing database is auto-saved as data.db.bak-… but the server needs a restart to load the new one.`,
      confirmLabel: "Replace database",
      destructive: true,
    });
    if (!ok) return;
    setPending(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    const r = await safeFetch<{ ok: true; message: string; bytes: number }>(
      "/api/restore",
      { method: "POST", body: formData },
    );
    setResult(r.ok ? r.data : { ok: false, error: r.error });
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept=".db,application/octet-stream"
          required
          disabled={pending}
          className="block flex-1 min-w-[200px] text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-violet-500/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-violet-300 hover:file:bg-violet-500/25"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-amber-500/15 px-3 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Restoring…
            </>
          ) : (
            <>
              <Upload className="size-3" />
              Restore from this file
            </>
          )}
        </button>
      </div>
      {result && result.ok && (
        <p className="flex items-start gap-1 rounded-md bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
          <CheckCircle2 className="size-3 shrink-0 mt-0.5" />
          {result.message}
        </p>
      )}
      {result && !result.ok && (
        <p className="flex items-start gap-1 rounded-md bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30">
          <AlertCircle className="size-3 shrink-0 mt-0.5" />
          {result.error}
        </p>
      )}
    </form>
  );
}
