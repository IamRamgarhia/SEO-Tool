export const dynamic = "force-dynamic";

import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { listReplyLocations } from "./actions";
import { ReplyClient } from "./client";

export default async function GbpReplyPage() {
  const r = await listReplyLocations();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="GBP review reply AI"
        description="Pull reviews, AI drafts a reply each, you approve or edit, post via the GBP API."
        icon={MessageCircle}
        accent="emerald"
      />
      {r.ok ? (
        <ReplyClient locations={r.locations} />
      ) : (
        <div className="glass-apple rounded-2xl p-5 text-sm text-rose-300">
          {r.error.includes("scope")
            ? "Google Business Profile scope not granted. Reconnect Google with the business.manage scope under Settings → Google."
            : `Couldn't list GBP locations: ${r.error}`}
        </div>
      )}
    </div>
  );
}
