"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { applyPlaybookToClient } from "../actions";

export function ApplyPlaybookForm({
  playbookId,
  taskCount,
  clients,
}: {
  playbookId: string;
  taskCount: number;
  clients: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState<number>(clients[0]?.id ?? 0);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ count: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function apply() {
    if (!clientId) return;
    setErr(null);
    setDone(null);
    startTransition(async () => {
      const res = await applyPlaybookToClient({ playbookId, clientId });
      if (res.ok) {
        setDone({ count: res.created });
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5" />
          Created {done.count} tasks. View in{" "}
          <a href="/tasks" className="underline">
            Tasks
          </a>
          .
        </span>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="text-emerald-300/70 hover:text-emerald-300"
        >
          Apply again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={clientId}
        onChange={(e) => setClientId(Number(e.target.value))}
        disabled={pending}
        className="flex h-9 flex-1 rounded-md border border-input bg-background px-2.5 text-xs"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={apply}
        disabled={pending || !clientId}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground ring-1 ring-inset ring-white/15 transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            Creating…
          </>
        ) : (
          <>
            <Sparkles className="size-3" />
            Apply ({taskCount} tasks)
          </>
        )}
      </button>
      {err && (
        <span className="w-full text-xs text-rose-300">{err}</span>
      )}
    </div>
  );
}
