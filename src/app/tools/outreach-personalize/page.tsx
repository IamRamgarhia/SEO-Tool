export const dynamic = "force-dynamic";

import { Send } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { OutreachForm } from "./outreach-form";

export default function OutreachPersonalizePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Outreach personalizer"
        description="Paste a prospect URL + your generic template. AI fetches their site, finds their recent posts and topical signals, and rewrites your opener with one specific reference. Turns a 2% reply rate into 15%."
        icon={Send}
        accent="rose"
      />
      <OutreachForm />
    </div>
  );
}
