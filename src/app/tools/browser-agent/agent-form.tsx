"use client";

import { useActionState } from "react";
import { Bot, Loader2, MoveRight } from "lucide-react";
import { runAgent, type AgentState } from "./actions";

const ACTION_TONE: Record<string, string> = {
  navigate: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  click: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  type: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  scroll: "bg-white/5 text-muted-foreground ring-white/10",
  extract: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  done: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

export function AgentForm() {
  const [state, formAction, pending] = useActionState<
    AgentState | null,
    FormData
  >(runAgent, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Start URL</span>
          <input
            name="startUrl"
            required
            placeholder="https://www.example.com"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Goal (plain English)</span>
          <textarea
            name="goal"
            required
            rows={3}
            placeholder="Find the pricing page and extract every plan name + monthly price"
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Max steps</span>
          <input
            name="maxSteps"
            type="number"
            defaultValue={12}
            min={1}
            max={25}
            className="h-9 w-32 rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-violet-500/15 px-5 text-sm font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Driving Chrome…
            </>
          ) : (
            <>
              <Bot className="mr-2 size-4" />
              Run agent
            </>
          )}
        </button>
        <p className="text-[10px] text-muted-foreground">
          The agent runs entirely in your local headless Chrome via the browser
          pool — no third-party automation API. Each step is logged with a
          screenshot for review.
        </p>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">
                {state.result.finished
                  ? "✓ Goal completed"
                  : `Stopped after ${state.result.steps.length} step${state.result.steps.length === 1 ? "" : "s"}`}
              </h2>
              <span className="text-xs text-muted-foreground">
                Final URL:{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5">
                  {state.result.finalUrl?.replace(/^https?:\/\//, "") ?? "—"}
                </code>
              </span>
            </div>
            {state.result.error && (
              <p className="mt-2 text-xs text-rose-300">{state.result.error}</p>
            )}
          </section>

          {state.result.extracted.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold">Extracted data</h3>
              {state.result.extracted.map((e, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                  <pre className="mt-1 max-h-[300px] overflow-auto rounded-md bg-black/40 p-3 font-mono text-[11px]">
                    {JSON.stringify(e.data, null, 2)}
                  </pre>
                </div>
              ))}
            </section>
          )}

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-3">
              <h3 className="text-sm font-semibold">
                Step log ({state.result.steps.length})
              </h3>
            </header>
            <ul className="divide-y divide-white/[0.05]">
              {state.result.steps.map((s) => (
                <li key={s.index} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      #{s.index + 1}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ring-1 ring-inset ${ACTION_TONE[s.action.kind] ?? "bg-white/5 ring-white/10"}`}
                    >
                      {s.action.kind}
                    </span>
                    <MoveRight className="size-3 text-muted-foreground/60" />
                    <span className="text-xs">{s.reasoning}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.result}
                  </p>
                  {s.screenshot && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={s.screenshot}
                      alt={`step ${s.index}`}
                      className="mt-2 max-h-[300px] rounded-md ring-1 ring-inset ring-white/5"
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
