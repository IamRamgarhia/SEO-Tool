export const dynamic = "force-dynamic";

import { Link2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { AnchorForm } from "./anchor-form";

export default function AnchorDistributionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Anchor-text distribution"
        description="Paste any URL — we extract every anchor, classify internal vs external, surface the most-used phrases. Catch over-optimization (>5% exact-match), missing brand variation, sparse internal linking."
        icon={Link2}
        accent="violet"
      />
      <AnchorForm />
    </div>
  );
}
