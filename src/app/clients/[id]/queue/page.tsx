export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Inbox } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, publishQueue } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { QueueList } from "./queue-list";

export default async function ClientQueuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  const items = await db
    .select()
    .from(publishQueue)
    .where(eq(publishQueue.clientId, clientId))
    .orderBy(desc(publishQueue.generatedAt))
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to {client.name}
      </Link>

      <PageHeader
        title={`Review queue · ${client.name}`}
        description="AI-generated items waiting for your review. Approve to publish on the next agent tick — or approve + publish now for immediate posting. Reject anything that isn't on-brand."
        icon={Inbox}
        accent="violet"
        actions={
          <Link
            href={`/clients/${clientId}/automations`}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25"
          >
            <Calendar className="size-3.5" />
            Schedules
          </Link>
        }
      />

      <QueueList items={items} clientId={clientId} />
    </div>
  );
}
