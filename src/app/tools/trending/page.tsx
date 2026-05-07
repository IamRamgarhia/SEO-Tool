export const dynamic = "force-dynamic";

import { Flame } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TrendingForm } from "./trending-form";

export default function TrendingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Trending content ideas"
        description="Type a topic. We pull rising signals from Google Trends, autocomplete a-z expansion, People Also Ask, related searches, and Reddit threads — then AI synthesises 10-15 publish-ready ideas tied to specific signals. Free, no paid keyword API."
        icon={Flame}
        accent="amber"
      />
      <TrendingForm />
    </div>
  );
}
