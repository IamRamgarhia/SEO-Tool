"use client";

import { useActionState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { createGridSchedule, type CreateScheduleResult } from "../../actions";

export function ScheduleForm({ clientId }: { clientId: number }) {
  const [state, formAction, pending] = useActionState<
    CreateScheduleResult | null,
    FormData
  >(createGridSchedule, null);

  return (
    <form
      action={formAction}
      className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <CalendarPlus className="size-4 text-violet-300" />
        Schedule recurring grid
      </h3>
      <p className="text-[11px] text-muted-foreground">
        The daily-agent re-runs scheduled grids automatically. Useful for
        weekly local-rank monitoring without re-clicking the form.
      </p>

      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-xs md:col-span-3">
          <span className="text-muted-foreground">Query</span>
          <input
            name="query"
            required
            placeholder="vegan bakery near me"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Centre lat</span>
          <input
            name="centerLat"
            type="number"
            step="0.000001"
            required
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Centre lng</span>
          <input
            name="centerLng"
            type="number"
            step="0.000001"
            required
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Cadence</span>
          <select
            name="cadence"
            defaultValue="weekly"
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Grid</span>
          <select
            name="size"
            defaultValue="5"
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            <option value="3">3×3</option>
            <option value="5">5×5</option>
            <option value="7">7×7</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Spacing (m)</span>
          <input
            name="spacingM"
            type="number"
            min={500}
            max={10000}
            defaultValue={1500}
            step={250}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-violet-500/15 px-4 text-xs font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-3 animate-spin" />
            Saving…
          </>
        ) : (
          "Save schedule"
        )}
      </button>
      {state?.ok && <p className="text-xs text-emerald-300">✓ Scheduled.</p>}
      {state && !state.ok && (
        <p className="text-xs text-rose-300">{state.error}</p>
      )}
    </form>
  );
}
