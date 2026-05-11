import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { getOnboardingChecklist } from "@/lib/onboarding-checklist";

/**
 * Persistent onboarding checklist for the dashboard. Auto-detects what's
 * done from real DB state — no flags to toggle. Disappears entirely once
 * all 5 steps are done; until then it shows progress + the next two
 * uncompleted steps prominently.
 */
export async function OnboardingChecklistPanel() {
  const { steps, done, total } = await getOnboardingChecklist();
  if (done === total) return null; // hide once everything is set up

  const pct = Math.round((done / total) * 100);
  const nextSteps = steps.filter((s) => !s.done).slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-card/40 to-card/40 backdrop-blur-md">
      <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-violet-500/15 blur-3xl" />
      <header className="relative flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-violet-500/15 ring-1 ring-inset ring-violet-500/30">
            <Sparkles className="size-4 text-violet-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              Get set up · {done} of {total} done
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {nextSteps.length === 1
                ? "One step left and you're fully running."
                : `Finish ${nextSteps.length} more steps to unlock the full tool.`}
            </p>
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-violet-300">
              {pct}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              complete
            </p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-5 pt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-500 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="relative space-y-2 p-5">
        {steps.map((step) => (
          <li key={step.id}>
            <div
              className={
                step.done
                  ? "flex items-start gap-3 rounded-lg bg-emerald-500/[0.04] p-3 ring-1 ring-inset ring-emerald-500/20"
                  : "flex items-start gap-3 rounded-lg bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-white/[0.05]"
              }
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" />
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className={
                    step.done
                      ? "text-sm font-medium text-emerald-200 line-through decoration-emerald-500/40"
                      : "text-sm font-medium"
                  }
                >
                  {step.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {step.description}
                </p>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-500/15 px-3 text-xs font-medium text-violet-200 ring-1 ring-inset ring-violet-500/30 transition-colors hover:bg-violet-500/25"
                >
                  {step.cta}
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
