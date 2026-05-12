export const dynamic = "force-dynamic";

import { Megaphone } from "lucide-react";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { AdsFunnelForm } from "./form";

export default async function AdsFunnelToolPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  const preselectClientId = params?.clientId ? Number(params.clientId) : null;

  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      url: clients.url,
      niche: clients.niche,
    })
    .from(clients)
    .orderBy(desc(clients.createdAt));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Ad Funnel Architect"
        description="Multi-platform paid-ads strategy generator. Pick where you want to run ads, describe your business + offer, and get a complete launch-ready package: copy variants per platform, image-gen prompts, keyword bundles, funnel map, budget split, and tracking setup."
        icon={Megaphone}
        accent="rose"
      />

      <AdsFunnelForm
        clients={allClients.map((c) => ({
          id: c.id,
          name: c.name,
          url: c.url,
          niche: c.niche,
        }))}
        preselectClientId={preselectClientId}
      />
    </div>
  );
}
