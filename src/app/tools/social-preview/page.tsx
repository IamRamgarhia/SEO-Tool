export const dynamic = "force-dynamic";

import { Share2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { SocialForm } from "./social-form";

export default function SocialPreviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="OG / Twitter card preview"
        description="See exactly how your URL will look when pasted into X / LinkedIn / Slack / Facebook / iMessage. Catches missing og:image, relative URLs, missing twitter:card — the things that quietly halve your social CTR."
        icon={Share2}
        accent="cyan"
      />
      <SocialForm />
    </div>
  );
}
