"use client";

import { useActionState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { runDns, type DnsState } from "./actions";

export function DnsForm() {
  const [state, formAction, pending] = useActionState<DnsState | null, FormData>(
    runDns,
    null,
  );

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <input
            name="host"
            required
            placeholder="example.com or https://example.com"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Resolving…
              </>
            ) : (
              <>
                <Globe className="mr-2 size-3" />
                Lookup
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
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Stat label="A records" value={state.result.a.length.toString()} />
            <Stat label="AAAA" value={state.result.aaaa.length.toString()} />
            <Stat label="MX" value={state.result.mx.length.toString()} />
            <Stat
              label="Days to expiry"
              value={state.result.daysUntilExpiry !== null ? `${state.result.daysUntilExpiry}` : "—"}
              tone={
                state.result.daysUntilExpiry === null
                  ? undefined
                  : state.result.daysUntilExpiry < 30
                    ? "rose"
                    : state.result.daysUntilExpiry < 90
                      ? "amber"
                      : "emerald"
              }
            />
          </div>

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

          <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
            <h3 className="mb-3 text-sm font-semibold">Records</h3>
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <Group label="A" items={state.result.a} />
              <Group label="AAAA" items={state.result.aaaa} />
              <Group label="MX" items={state.result.mx.map((m) => `${m.priority} ${m.exchange}`)} />
              <Group label="NS" items={state.result.ns} />
              <Group label="TXT" items={state.result.txt} />
              <Group label="CNAME" items={state.result.cname} />
            </div>
          </section>

          <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-semibold">Registration (RDAP)</h3>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <Field label="Registrar" value={state.result.registrar ?? "—"} />
              <Field label="Created" value={state.result.created ?? "—"} />
              <Field label="Expires" value={state.result.expires ?? "—"} />
              <Field label="Updated" value={state.result.updated ?? "—"} />
              <Field label="Status" value={state.result.status.join(", ") || "—"} />
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const t = tone ? { emerald: "text-emerald-300", amber: "text-amber-300", rose: "text-rose-300" }[tone] : "";
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${t}`}>{value}</div>
    </div>
  );
}

function Group({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-md bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {items.length === 0 ? (
        <p className="mt-1 text-muted-foreground/70">—</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {items.map((s, i) => (
            <li key={i} className="break-all">
              <code>{s}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 rounded-md bg-white/[0.03] px-3 py-1.5 ring-1 ring-inset ring-white/5">
      <span className="text-muted-foreground">{label}</span>
      <code className="break-all">{value}</code>
    </div>
  );
}
