export const dynamic = "force-dynamic";

import { TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { listGscProperties } from "@/lib/google-oauth";
import { TrafficDropForm } from "./traffic-drop-form";

export default async function TrafficDropPage() {
  let properties: { siteUrl: string }[] = [];
  try {
    properties = await listGscProperties();
  } catch {
    properties = [];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Why did my traffic drop?"
        description="Pulls last 28 days vs the 28 days before that from GSC. Diffs queries, pages, impressions. Cross-references curated Google algorithm-update timeline. AI ranks the most likely cause and writes 3-4 verification steps."
        icon={TrendingDown}
        accent="rose"
      />
      {properties.length === 0 ? (
        <div className="glass-apple rounded-2xl p-5 text-sm text-muted-foreground">
          Connect Google Search Console first — Settings → Google.
        </div>
      ) : (
        <TrafficDropForm properties={properties.map((p) => p.siteUrl)} />
      )}
    </div>
  );
}
