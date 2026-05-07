export const dynamic = "force-dynamic";

import { ServerCog } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { LogAnalyzerForm } from "./log-form";

export default function LogAnalyzerPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Server log analyzer"
        description="Paste your raw Apache or Nginx access log. We surface Googlebot crawl-budget analytics — top crawled URLs, error rates, parameter-URL waste, AI-bot share, hourly distribution. Pure regex, no upload to anyone."
        icon={ServerCog}
        accent="violet"
      />
      <LogAnalyzerForm />
    </div>
  );
}
