"use client";

import { useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { dismissNextStep } from "./next-step-action";

/**
 * Tiny X button on the NextStep pill. Sets a 1-year cookie that the
 * server-side step picker reads to skip this step on every subsequent
 * render. The chain falls through to the next priority tier
 * automatically — e.g. dismiss "Connect Google" → "Run your first
 * audit" takes over.
 */
export function NextStepDismissButton({ stepId }: { stepId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await dismissNextStep(stepId);
        })
      }
      disabled={pending}
      title="Hide this suggestion"
      aria-label="Hide this suggestion"
      className="grid size-5 place-items-center rounded text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <X className="size-3" />
      )}
    </button>
  );
}
