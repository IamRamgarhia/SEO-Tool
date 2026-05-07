export const dynamic = "force-dynamic";

import { Code2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { AiSchemaForm } from "./ai-schema-form";

export default function AiSchemaPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="AI schema generator (from URL)"
        description="Paste any URL — we fetch the page, classify content type, and AI emits valid JSON-LD schema markup grounded in the actual on-page content. Won't invent fields that aren't there (Google penalises for that)."
        icon={Code2}
        accent="cyan"
      />
      <AiSchemaForm />
    </div>
  );
}
