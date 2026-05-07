export const dynamic = "force-dynamic";

import { Compass } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { IntentForm } from "./intent-form";

export default function IntentClassifierPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Bulk search-intent classifier"
        description="Paste up to 200 queries — AI classifies each as informational / navigational / commercial / transactional / local + suggests the best content format. Falls back to regex heuristics if AI isn't configured."
        icon={Compass}
        accent="cyan"
      />
      <IntentForm />
    </div>
  );
}
