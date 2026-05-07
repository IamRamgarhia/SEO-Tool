export const dynamic = "force-dynamic";

import { Mail } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { buildWeeklyDigest } from "@/lib/weekly-digest";
import { DigestView } from "./view";

export default async function DigestPage() {
  const digest = await buildWeeklyDigest();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Weekly digest"
        description="The Monday-morning agency-owner one-pager. Per-client wins/concerns, week-over-week aggregate, algorithm-update overlap. Copy text or HTML to email/Slack."
        icon={Mail}
        accent="cyan"
      />
      <DigestView digest={digest} />
    </div>
  );
}
