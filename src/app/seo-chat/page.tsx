export const dynamic = "force-dynamic";

import { Bot } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { SeoChatUi } from "./chat-ui";

export default function SeoChatPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="SEO Chat"
        description="Ask anything SEO. Upload an image for image-SEO analysis (alt, filename, compression, schema). Pick a focus skill (technical / on-page / off-page / local / e-commerce / international / news / image / video / AI-visibility / schema / migration / analytics / penalty / audit / keyword research / SERP / competitor / outreach / programmatic / mobile / page-experience / accessibility / editorial / reputation) to narrow the AI to that specialty."
        icon={Bot}
        accent="violet"
      />
      <SeoChatUi />
    </div>
  );
}
