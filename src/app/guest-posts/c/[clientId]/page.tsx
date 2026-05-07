export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import {
  GUEST_POST_SITES,
  pickSitesForNiche,
} from "@/lib/guest-post-sites";
import { listDraftsForClient } from "./actions";
import { GuestPostComposer } from "./composer";

export default async function GuestPostsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: clientIdRaw } = await params;
  const clientId = Number(clientIdRaw);
  if (!Number.isFinite(clientId) || clientId <= 0) notFound();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  const recommended = pickSitesForNiche(client.niche);
  const drafts = await listDraftsForClient(clientId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href={`/link-building/c/${clientId}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to link building for {client.name}
      </Link>

      <PageHeader
        title={`Guest posts — ${client.name}`}
        description="Pick a target platform, give a topic and target keyword. AI writes a draft tuned to that platform's house style — varied cadence, real examples, anti-keyword-stuffing, E-E-A-T citations. Drafts are saved so you can iterate, push to WP, or paste straight in."
        icon={BookOpen}
        accent="amber"
      />

      <GuestPostComposer
        clientId={clientId}
        clientName={client.name}
        recommendedSites={recommended}
        allSites={GUEST_POST_SITES}
        drafts={drafts}
      />
    </div>
  );
}
