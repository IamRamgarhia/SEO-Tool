export const dynamic = "force-dynamic";

import { Bot } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { AgentForm } from "./agent-form";

export default function BrowserAgentPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Browser agent"
        description="Goal-driven headless Chrome. Give it a starting URL + a plain-English goal — it reads the page, decides the next step, executes, and narrates each move with a screenshot. Replaces 'I need an API for that site' with browser automation."
        icon={Bot}
        accent="violet"
      />
      <AgentForm />
    </div>
  );
}
