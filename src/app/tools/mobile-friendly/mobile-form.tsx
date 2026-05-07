"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { runMobile, type MobileState } from "./actions";

export function MobileForm() {
  const [state, formAction, pending] = useActionState<
    MobileState | null,
    FormData
  >(runMobile, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <input
            name="url"
            required
            placeholder="https://yoursite.com"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-500/15 px-4 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <Smartphone className="mr-2 size-3" />
                Check
              </>
            )}
          </button>
        </div>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-semibold">Checks</h3>
            <Row label="Viewport meta" ok={state.result.hasViewport} note={state.result.viewport ?? "—"} />
            <Row label="Viewport sane (width=device-width, scalable)" ok={state.result.viewportSane} />
            <Row label="Charset declared" ok={state.result.hasCharset} />
            <Row
              label="Responsive images"
              ok={state.result.hasResponsiveImages || state.result.imageCount === 0}
              note={`${state.result.imageCount} image${state.result.imageCount === 1 ? "" : "s"}`}
            />
            <Row
              label="No fixed-width elements"
              ok={state.result.fixedWidthElements <= 3}
              note={`${state.result.fixedWidthElements} suspicious`}
            />
            <Row
              label="Tap targets reasonable"
              ok={state.result.potentialTapTargetIssues <= 5}
              note={`${state.result.potentialTapTargetIssues} small`}
            />
            <Row
              label="No intrusive interstitial"
              ok={!state.result.hasInterstitial}
              note={state.result.hasInterstitial ? "modal/popup/cookie banner detected" : "ok"}
            />
          </section>

          {state.result.warnings.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-semibold">Warnings</h3>
              <ul className="space-y-1 text-xs">
                {state.result.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-300 ring-1 ring-inset ring-amber-500/30"
                  >
                    ⚠ {w}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Row({
  label,
  ok,
  note,
}: {
  label: string;
  ok: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-3 py-1.5 text-xs">
      <span className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-3 text-emerald-300" />
        ) : (
          <XCircle className="size-3 text-rose-300" />
        )}
        <span>{label}</span>
      </span>
      {note && <span className="text-muted-foreground">{note}</span>}
    </div>
  );
}
