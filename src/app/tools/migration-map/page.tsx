export const dynamic = "force-dynamic";

import { GitMerge } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { MigrationForm } from "./migration-form";

export default function MigrationMapPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Migration redirect-map generator"
        description="Paste old URL list + new URL list. We map every old URL to its closest new URL using token overlap + path-segment similarity. Outputs an Nginx / Apache / Next.js redirect block ready to ship. Saves a 50-page migration from a multi-day spreadsheet job."
        icon={GitMerge}
        accent="amber"
      />
      <MigrationForm />
    </div>
  );
}
