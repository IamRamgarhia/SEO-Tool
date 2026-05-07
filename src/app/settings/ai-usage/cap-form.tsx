"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { saveCap, type SaveCapState } from "./actions";

export function CapForm({ initial }: { initial: string }) {
  const [state, formAction, pending] = useActionState<
    SaveCapState | null,
    FormData
  >(saveCap, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">Monthly cap (USD)</span>
        <input
          name="cap"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initial}
          placeholder="(blank = no cap)"
          className="h-9 w-40 rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-amber-500/15 px-4 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-3 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save className="mr-2 size-3" />
            Save cap
          </>
        )}
      </button>
      {state?.ok && (
        <span className="text-xs text-emerald-300">{state.message}</span>
      )}
      {state && !state.ok && (
        <span className="text-xs text-rose-300">{state.error}</span>
      )}
    </form>
  );
}
