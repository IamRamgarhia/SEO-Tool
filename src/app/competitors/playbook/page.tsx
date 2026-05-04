export const dynamic = "force-dynamic";

import { Network } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PlaybookForm } from "./playbook-form";

export default function CompetitorPlaybookPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Competitor playbook"
        description="Reverse-engineer any competitor's SEO strategy. Crawls their public site, extracts content silos, detects their tech stack, and generates a punch list of what they do that you don't."
        icon={Network}
        accent="violet"
      />
      <PlaybookForm />
    </div>
  );
}
