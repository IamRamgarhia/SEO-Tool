export const dynamic = "force-dynamic";

import { Network } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { LinkGraphForm } from "./form";

export default function LinkGraphPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Internal-link analyser"
        description="Crawls the site, builds a link graph, and surfaces orphan pages with AI-free content-similarity-based suggestions for where to link them from. Free, fast, no LLM required."
        icon={Network}
        accent="violet"
      />
      <LinkGraphForm />
    </div>
  );
}
