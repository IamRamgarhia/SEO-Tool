export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  ExternalLink,
  Link2,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { db } from "@/db/client";
import {
  clients,
  resourceSubmissions,
  seoResources,
} from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import {
  CATEGORY_LABELS,
  ensureSeoResourcesSeeded,
} from "@/lib/seo-resources-loader";
import {
  scoreNicheProspects,
  type ScoredProspect,
} from "@/lib/backlink-niche-matcher";
import {
  difficultyEffortHint,
  difficultyTone,
} from "@/lib/backlink-difficulty";
import { ClientLinkBuildingHub } from "./hub";

export default async function ClientLinkBuildingPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: clientIdRaw } = await params;
  const clientId = Number(clientIdRaw);
  if (!Number.isFinite(clientId) || clientId <= 0) notFound();

  await ensureSeoResourcesSeeded();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  // AI-deterministic prospect scoring (no AI cost)
  const ranked = await scoreNicheProspects(
    {
      niche: client.niche,
      city: client.city,
      country: client.country,
      businessType: client.businessType,
      description: client.description,
    },
    80,
  );

  // Already tracked for this client
  const tracked = await db
    .select({
      id: resourceSubmissions.id,
      resourceId: resourceSubmissions.resourceId,
      status: resourceSubmissions.status,
      submittedUrl: resourceSubmissions.submittedUrl,
      submittedAt: resourceSubmissions.submittedAt,
      createdAt: resourceSubmissions.createdAt,
      url: seoResources.url,
      domain: seoResources.domain,
      category: seoResources.category,
      da: seoResources.da,
    })
    .from(resourceSubmissions)
    .leftJoin(seoResources, eq(resourceSubmissions.resourceId, seoResources.id))
    .where(eq(resourceSubmissions.clientId, clientId))
    .orderBy(desc(resourceSubmissions.createdAt));

  const trackedIds = new Set(tracked.map((t) => t.resourceId));
  const unTrackedRanked = ranked.filter((r) => !trackedIds.has(r.resource.id));

  // 30-day stats
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLive = await db
    .select({ id: resourceSubmissions.id })
    .from(resourceSubmissions)
    .where(
      and(
        eq(resourceSubmissions.clientId, clientId),
        eq(resourceSubmissions.status, "live"),
        gte(resourceSubmissions.submittedAt, cutoff),
      ),
    );
  const totalLive = tracked.filter((t) => t.status === "live").length;
  const totalActive = tracked.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/link-building"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to global link-building
      </Link>

      <PageHeader
        title={`Link building — ${client.name}`}
        description="AI-matched prospects for this client's niche, city, and business type. Track each link as you build it. Live URLs are auto-recorded with the build date."
        icon={Link2}
        accent="emerald"
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <CheckCircle2 className="size-3" />
              {totalLive} live links
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-violet-300 ring-1 ring-inset ring-violet-500/30">
              <Sparkles className="size-3" />
              {recentLive.length} built last 30d
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-muted-foreground ring-1 ring-inset ring-white/10">
              {totalActive} on tracker
            </span>
            <Link
              href={`/guest-posts/c/${clientId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/20"
            >
              <Compass className="size-3" />
              Guest post composer
            </Link>
          </div>
        }
      />

      <ClientLinkBuildingHub
        clientId={clientId}
        ranked={unTrackedRanked}
        tracked={tracked}
        clientName={client.name}
      />

      <ClientStaticHelp ranked={ranked} />
    </div>
  );
}

function ClientStaticHelp({ ranked }: { ranked: ScoredProspect[] }) {
  const easy = ranked.filter((r) => r.difficulty === "easy").length;
  const medium = ranked.filter((r) => r.difficulty === "medium").length;
  const hard = ranked.filter((r) => r.difficulty === "hard").length;

  return (
    <section className="rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md">
      <h3 className="text-sm font-semibold">How difficulty is scored</h3>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <Tone label="Easy" diff="easy" count={easy} />
        <Tone label="Medium" diff="medium" count={medium} />
        <Tone label="Hard" diff="hard" count={hard} />
      </div>
    </section>
  );
}

function Tone({
  label,
  diff,
  count,
}: {
  label: string;
  diff: "easy" | "medium" | "hard";
  count: number;
}) {
  return (
    <div
      className={`rounded-xl border border-white/5 bg-black/20 p-3 ring-1 ring-inset ${difficultyTone(diff)}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider opacity-80">
          {label}
        </span>
        <span className="font-semibold tabular-nums">{count}</span>
      </div>
      <p className="mt-1.5 text-[11px] opacity-80">{difficultyEffortHint(diff)}</p>
    </div>
  );
}

// Re-exports for the hub child component
export { CATEGORY_LABELS, ExternalLink, Send, XCircle };
