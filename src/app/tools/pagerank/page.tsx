export const dynamic = "force-dynamic";

import { Network } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PagerankForm } from "./pagerank-form";

export default function PagerankPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Internal PageRank simulator"
        description="Crawls your site, builds the link graph, runs 30 iterations of PageRank with damping=0.85. Surfaces your authority pages (hubs) and starved pages (low PR + few inbound links). The fastest way to find pages worth linking to that aren't currently being linked from anywhere."
        icon={Network}
        accent="violet"
      />
      <PagerankForm />
    </div>
  );
}
