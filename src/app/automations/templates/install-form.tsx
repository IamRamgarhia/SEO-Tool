"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, AlertCircle } from "lucide-react";
import { installWorkflowTemplate } from "../actions";
import type { WorkflowTemplate } from "@/lib/workflow-templates";

export function InstallTemplateForm({
  template,
  clients,
}: {
  template: WorkflowTemplate;
  clients: { id: number; name: string }[];
}) {
  const [clientId, setClientId] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const needsWebhook = template.action.kind === "webhook";

  function install() {
    setErr(null);
    setDone(false);
    if (needsWebhook && !/^https?:\/\//i.test(webhookUrl.trim())) {
      setErr("Paste a Slack or Discord webhook URL first.");
      return;
    }
    startTransition(async () => {
      const r = await installWorkflowTemplate({
        templateId: template.id,
        clientId: clientId ? Number(clientId) : null,
        webhookUrl: needsWebhook ? webhookUrl.trim() : undefined,
      });
      if (r.ok) {
        setDone(true);
        router.refresh();
      } else {
        setErr(r.error);
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5" />
          Installed. View in{" "}
          <a href="/automations" className="underline">
            Automations
          </a>
          .
        </span>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="text-emerald-300/70 hover:text-emerald-300"
        >
          Install again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={pending}
          className="flex h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {needsWebhook && (
          <input
            type="url"
            placeholder="Slack/Discord webhook URL"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            disabled={pending}
            className="flex h-9 rounded-md border border-input bg-background px-2 text-xs"
          />
        )}
      </div>
      <button
        type="button"
        onClick={install}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground ring-1 ring-inset ring-white/15 transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            Installing…
          </>
        ) : (
          <>
            <Plus className="size-3" />
            Install
          </>
        )}
      </button>
      {err && (
        <div className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30">
          <AlertCircle className="size-3" />
          {err}
        </div>
      )}
    </div>
  );
}
