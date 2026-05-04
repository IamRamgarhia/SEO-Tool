import Link from "next/link";
import { db } from "@/db/client";
import {
  audits,
  clients,
  monitoredPages,
  pageChanges,
  tasks,
} from "@/db/schema";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  GitCommit,
  Sparkles,
  TrendingDown,
} from "lucide-react";

type BriefItem = {
  kind: "page-change" | "audit-issue" | "stale-task" | "decay";
  client: { id: number; name: string } | null;
  title: string;
  detail: string;
  href: string;
  detectedAt: Date;
  severity: "high" | "medium" | "low";
};

const sevTone: Record<BriefItem["severity"], string> = {
  high: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-white/5 text-muted-foreground ring-white/10",
};

const kindIcon: Record<BriefItem["kind"], typeof Clock> = {
  "page-change": GitCommit,
  "audit-issue": AlertTriangle,
  "stale-task": Clock,
  decay: TrendingDown,
};

const kindLabel: Record<BriefItem["kind"], string> = {
  "page-change": "Page change",
  "audit-issue": "Audit",
  "stale-task": "Stale task",
  decay: "Decay",
};

async function gatherBriefing(): Promise<BriefItem[]> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const items: BriefItem[] = [];

  // Recent page changes (last 24h)
  const changes = await db
    .select({
      id: pageChanges.id,
      field: pageChanges.field,
      oldValue: pageChanges.oldValue,
      newValue: pageChanges.newValue,
      detectedAt: pageChanges.detectedAt,
      url: monitoredPages.url,
      label: monitoredPages.label,
      clientId: monitoredPages.clientId,
      clientName: clients.name,
    })
    .from(pageChanges)
    .innerJoin(
      monitoredPages,
      eq(pageChanges.monitoredPageId, monitoredPages.id),
    )
    .leftJoin(clients, eq(monitoredPages.clientId, clients.id))
    .where(gte(pageChanges.detectedAt, dayAgo))
    .orderBy(desc(pageChanges.detectedAt))
    .limit(10);

  for (const c of changes) {
    items.push({
      kind: "page-change",
      client:
        c.clientId && c.clientName
          ? { id: c.clientId, name: c.clientName }
          : null,
      title: `${c.field} changed on ${c.label || new URL(c.url).pathname}`,
      detail: `${truncate(c.oldValue, 40)} → ${truncate(c.newValue, 40)}`,
      href: c.clientId ? `/monitor/c/${c.clientId}` : `/monitor`,
      detectedAt: c.detectedAt,
      severity: c.field === "title" || c.field === "canonical" ? "high" : "medium",
    });
  }

  // Audits completed in last 24h with high issue counts
  const recentAudits = await db
    .select({
      id: audits.id,
      score: audits.score,
      issuesCount: audits.issuesCount,
      completedAt: audits.completedAt,
      clientId: audits.clientId,
      clientName: clients.name,
    })
    .from(audits)
    .leftJoin(clients, eq(audits.clientId, clients.id))
    .where(
      and(
        eq(audits.status, "completed"),
        gte(audits.completedAt, dayAgo),
      ),
    )
    .orderBy(desc(audits.completedAt))
    .limit(10);

  for (const a of recentAudits) {
    if (a.issuesCount === null || a.issuesCount === 0) continue;
    if (!a.completedAt) continue;
    items.push({
      kind: "audit-issue",
      client:
        a.clientId && a.clientName
          ? { id: a.clientId, name: a.clientName }
          : null,
      title: `Audit found ${a.issuesCount} issues`,
      detail:
        a.score !== null
          ? `Score ${a.score}/100 · ${a.clientName ?? "unknown"}`
          : `${a.clientName ?? "unknown"}`,
      href: `/audits/${a.id}`,
      detectedAt: a.completedAt,
      severity:
        a.issuesCount > 30 ? "high" : a.issuesCount > 10 ? "medium" : "low",
    });
  }

  // Stale tasks (created over a week ago, still todo)
  const staleTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      createdAt: tasks.createdAt,
      clientId: tasks.clientId,
      clientName: clients.name,
    })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(and(eq(tasks.status, "todo"), lt(tasks.createdAt, weekAgo)))
    .orderBy(
      sql`CASE ${tasks.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
      desc(tasks.createdAt),
    )
    .limit(5);

  for (const t of staleTasks) {
    const ageDays = Math.floor(
      (now.getTime() - t.createdAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    items.push({
      kind: "stale-task",
      client:
        t.clientId && t.clientName
          ? { id: t.clientId, name: t.clientName }
          : null,
      title: t.title,
      detail: `Created ${ageDays}d ago · ${t.priority} priority`,
      href: `/tasks`,
      detectedAt: t.createdAt,
      severity: t.priority === "high" ? "high" : "medium",
    });
  }

  return items
    .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
    .slice(0, 8);
}

function truncate(s: string | null, n: number): string {
  if (!s) return "(empty)";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export async function MorningBriefing() {
  const items = await gatherBriefing();

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30">
            <Sparkles className="size-4 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Today&apos;s briefing</h2>
            <p className="text-[11px] text-muted-foreground">
              What changed in the last 24h across your portfolio.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-white/10">
          {items.length} signal{items.length === 1 ? "" : "s"}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          All quiet. No new page changes, audit issues, or stale tasks. Your
          mornings should look like this.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((it, i) => {
            const Icon = kindIcon[it.kind];
            return (
              <li key={i}>
                <Link
                  href={it.href}
                  className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <div
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${sevTone[it.severity]}`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-white/10">
                        {kindLabel[it.kind]}
                      </span>
                      {it.client && (
                        <span className="truncate text-[11px] font-medium text-muted-foreground">
                          {it.client.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">
                      {it.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {it.detail}
                    </div>
                  </div>
                  <ArrowRight className="mt-2 size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
