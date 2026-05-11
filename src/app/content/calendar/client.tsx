"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";
import { clearScheduledDate, setScheduledDate } from "./actions";

type Brief = {
  id: number;
  clientId: number;
  title: string;
  status: string;
  targetKeyword: string;
  scheduledFor: string | null;
  updatedAt: string;
  publishedUrl: string | null;
};

const STATUS_TONE: Record<string, string> = {
  idea: "bg-white/5 text-muted-foreground ring-white/10",
  outline: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  draft: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  review: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

export function CalendarClient({
  monthStart,
  monthEnd,
  briefs,
  clients,
}: {
  monthStart: Date;
  monthEnd: Date;
  briefs: Brief[];
  clients: { id: number; name: string }[];
}) {
  const [selected, setSelected] = useState<Brief | null>(null);

  // Build 6-week grid starting on the Sunday before monthStart
  const firstDay = new Date(monthStart);
  firstDay.setDate(monthStart.getDate() - monthStart.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(firstDay);
    d.setDate(firstDay.getDate() + i);
    days.push(d);
  }

  function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Index briefs by day. Scheduled takes precedence; else updatedAt.
  const byDay = new Map<string, Brief[]>();
  for (const b of briefs) {
    const anchor = b.scheduledFor
      ? new Date(b.scheduledFor)
      : new Date(b.updatedAt);
    const k = dayKey(anchor);
    const list = byDay.get(k) ?? [];
    list.push(b);
    byDay.set(k, list);
  }

  return (
    <>
      <section className="rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
        <div className="grid grid-cols-7 border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const inMonth =
              d.getMonth() === monthStart.getMonth() &&
              d.getFullYear() === monthStart.getFullYear();
            const todayList = byDay.get(dayKey(d)) ?? [];
            const isToday =
              d.toDateString() === new Date().toDateString();
            return (
              <div
                key={d.toISOString()}
                className={`min-h-[100px] border-b border-r border-white/[0.04] p-1.5 ${
                  inMonth ? "" : "bg-black/20 opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      isToday
                        ? "bg-violet-500/30 font-bold text-violet-200"
                        : "text-muted-foreground"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  {todayList.length > 0 && (
                    <span className="text-[9px] text-muted-foreground">
                      {todayList.length}
                    </span>
                  )}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {todayList.slice(0, 3).map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(b)}
                        className={`block w-full truncate rounded-sm px-1.5 py-0.5 text-left text-[10px] ring-1 ring-inset hover:bg-white/[0.05] ${STATUS_TONE[b.status] ?? STATUS_TONE.idea}`}
                        title={b.title}
                      >
                        {b.title}
                      </button>
                    </li>
                  ))}
                  {todayList.length > 3 && (
                    <li className="px-1.5 text-[10px] text-muted-foreground">
                      +{todayList.length - 3} more
                    </li>
                  )}
                </ul>
                {void monthEnd}
              </div>
            );
          })}
        </div>
      </section>

      {selected && (
        <BriefDrawer
          brief={selected}
          clients={clients}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function BriefDrawer({
  brief,
  clients,
  onClose,
}: {
  brief: Brief;
  clients: { id: number; name: string }[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const clientName = clients.find((c) => c.id === brief.clientId)?.name;
  return (
    <div
      role="dialog"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-apple w-full max-w-lg space-y-3 rounded-2xl p-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ring-1 ring-inset ${STATUS_TONE[brief.status]}`}
            >
              {brief.status}
            </span>
            <h2 className="text-base font-semibold">{brief.title}</h2>
            <p className="text-[11px] text-muted-foreground">
              target: {brief.targetKeyword}
              {clientName && ` · ${clientName}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <form
          action={setScheduledDate.bind(null, brief.id)}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Schedule for</span>
            <input
              type="date"
              name="scheduledFor"
              defaultValue={
                brief.scheduledFor
                  ? new Date(brief.scheduledFor).toISOString().split("T")[0]
                  : ""
              }
              className="h-9 rounded-md border border-white/10 bg-card/60 px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded-md bg-violet-500/15 px-3 text-xs font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25"
          >
            <CheckCircle2 className="size-3" />
            Save date
          </button>
          {brief.scheduledFor && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await clearScheduledDate(brief.id);
                  onClose();
                });
              }}
              className="text-[11px] text-rose-300 hover:underline disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3 text-[11px]">
          <Link
            href={`/blog/${brief.clientId}/bulk`}
            className="rounded-md bg-white/5 px-2.5 py-1 text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10"
          >
            Open in bulk writer
          </Link>
          {brief.publishedUrl && (
            <a
              href={brief.publishedUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/20"
            >
              View live ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
