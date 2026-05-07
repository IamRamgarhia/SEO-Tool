export const dynamic = "force-dynamic";

import { Bot } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { listConversations, type ChatKind } from "@/lib/chat-store";
import { ChatsClient } from "./client";

type SearchParams = { kind?: string };

export default async function ChatsArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const kind = (
    ["seo_chat", "ask_tool", "portal_chat"].includes(sp.kind ?? "")
      ? sp.kind
      : undefined
  ) as ChatKind | undefined;

  const conversations = await listConversations({
    kind,
    limit: 200,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="AI chat history"
        description="Every conversation with SEO chat, Ask the Tool, and the client portal AI is saved here. Click to view full transcript, pin to keep, rename for easy lookup, delete to clear."
        icon={Bot}
        accent="violet"
        meta={
          <span className="text-xs text-muted-foreground">
            {conversations.length} conversation
            {conversations.length === 1 ? "" : "s"}
            {conversations.filter((c) => c.pinned).length > 0 && (
              <>
                {" "}
                · {conversations.filter((c) => c.pinned).length} pinned
              </>
            )}
          </span>
        }
      />
      <ChatsClient conversations={conversations} currentKind={kind ?? "all"} />
    </div>
  );
}
