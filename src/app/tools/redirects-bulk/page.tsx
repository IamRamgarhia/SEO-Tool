export const dynamic = "force-dynamic";

import { CornerDownRight } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { BulkRedirectForm } from "./bulk-form";

export default function BulkRedirectsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Bulk redirect-chain tester"
        description="Paste up to 100 URLs. We trace every redirect hop, surface chains, loops, mixed-scheme jumps, dropped 301s. Migration-day staple."
        icon={CornerDownRight}
        accent="cyan"
      />
      <BulkRedirectForm />
    </div>
  );
}
