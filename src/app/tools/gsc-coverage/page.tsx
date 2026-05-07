export const dynamic = "force-dynamic";

import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { listGscProperties } from "@/lib/google-oauth";
import { CoverageForm } from "./coverage-form";

export default async function GscCoveragePage() {
  let properties: { siteUrl: string }[] = [];
  try {
    properties = await listGscProperties();
  } catch {
    properties = [];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="GSC index coverage (batch)"
        description="Paste up to 60 URLs from the same property. We hit Google's URL Inspection API for each, summarise indexing state, surface the ones that aren't indexed and why. Free — uses your GSC OAuth quota."
        icon={ListChecks}
        accent="emerald"
      />
      {properties.length === 0 ? (
        <div className="glass-apple rounded-2xl p-5 text-sm text-muted-foreground">
          Connect Google Search Console first — Settings → Google.
        </div>
      ) : (
        <CoverageForm properties={properties.map((p) => p.siteUrl)} />
      )}
    </div>
  );
}
