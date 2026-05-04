"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  ExternalLink,
  Globe,
  Loader2,
  Magnet,
  MapPin,
  Network,
  Phone,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickAddClient } from "@/app/clients/actions";
import {
  captureUrl,
  saveAsCompetitor,
  saveAsMonitoredPage,
} from "./actions";
import type { SiteMetadata } from "@/lib/site-metadata";

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; message: string }
  | { kind: "error"; message: string };

export function CaptureClient({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [meta, setMeta] = useState<SiteMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number>(clients[0]?.id ?? 0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });
  const router = useRouter();

  function run() {
    if (!url.trim()) return;
    setError(null);
    setMeta(null);
    setSaveStatus({ kind: "idle" });
    startTransition(async () => {
      const r = await captureUrl(url);
      if (r.ok) {
        setMeta(r.metadata);
      } else {
        setError(r.error);
      }
    });
  }

  function asCompetitor() {
    if (!meta) return;
    setSaveStatus({ kind: "saving" });
    startTransition(async () => {
      const r = await saveAsCompetitor({
        clientId,
        name: meta.name ?? new URL(meta.url).hostname,
        url: meta.url,
        notes: meta.description ?? undefined,
      });
      if (r.ok) {
        setSaveStatus({
          kind: "saved",
          message: "Saved as competitor.",
        });
        router.refresh();
      } else {
        setSaveStatus({ kind: "error", message: r.error });
      }
    });
  }

  function asMonitoredPage() {
    if (!meta) return;
    setSaveStatus({ kind: "saving" });
    startTransition(async () => {
      const r = await saveAsMonitoredPage({
        clientId,
        url: meta.url,
        label: meta.name ?? undefined,
      });
      if (r.ok) {
        setSaveStatus({
          kind: "saved",
          message: "Now tracking for changes.",
        });
        router.refresh();
      } else {
        setSaveStatus({ kind: "error", message: r.error });
      }
    });
  }

  function asClient() {
    if (!meta) return;
    setSaveStatus({ kind: "saving" });
    startTransition(async () => {
      const r = await quickAddClient(meta.url);
      if (r.ok) {
        router.push(`/clients/${r.id}`);
      } else {
        setSaveStatus({ kind: "error", message: r.error });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Input */}
      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <Label htmlFor="capture-url" className="text-sm">
          Paste a URL — homepage, article, competitor, anything
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="capture-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder="https://competitor.com or example.com/blog/post"
            className="flex-1"
            disabled={pending}
          />
          <Button onClick={run} disabled={pending || !url.trim()}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Extracting…
              </>
            ) : (
              <>
                <Magnet className="size-4" />
                Extract
              </>
            )}
          </Button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
            <AlertCircle className="size-3.5" />
            {error}
          </div>
        )}
      </section>

      {/* Extracted data */}
      {meta && (
        <section className="glass-apple relative overflow-hidden rounded-2xl">
          <header className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4">
            {meta.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.logoUrl}
                alt=""
                className="size-12 shrink-0 rounded-lg bg-white/5 object-contain ring-1 ring-inset ring-white/10"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold">
                  {meta.name ?? "(no name found)"}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                  <CheckCircle2 className="size-2.5" />
                  Reached
                </span>
              </div>
              <a
                href={meta.url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"
              >
                {meta.url}
                <ExternalLink className="size-3" />
              </a>
              {meta.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {meta.description}
                </p>
              )}
            </div>
          </header>

          <dl className="grid gap-x-4 gap-y-3 p-5 text-sm sm:grid-cols-2">
            {meta.address && (
              <Field icon={MapPin} label="Address" value={meta.address} />
            )}
            {meta.phone && (
              <Field icon={Phone} label="Phone" value={meta.phone} />
            )}
            {meta.email && (
              <Field icon={Globe} label="Email" value={meta.email} />
            )}
            {meta.gbpUrl && (
              <Field
                icon={MapPin}
                label="Google Business"
                value={meta.gbpUrl}
                isLink
              />
            )}
            {Object.entries(meta.socialLinks).map(([k, v]) =>
              v ? (
                <Field
                  key={k}
                  icon={Network}
                  label={k}
                  value={v}
                  isLink
                />
              ) : null,
            )}
          </dl>

          {/* Actions */}
          <div className="space-y-3 border-t border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Save it
            </div>

            {clients.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="capture-client" className="text-xs">
                  for client
                </Label>
                <select
                  id="capture-client"
                  value={clientId}
                  onChange={(e) => setClientId(Number(e.target.value))}
                  disabled={pending}
                  className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={asClient}
                disabled={pending}
              >
                <UserPlus className="size-4" />
                As new client
              </Button>
              {clients.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={asCompetitor}
                    disabled={pending}
                  >
                    <Sparkles className="size-4" />
                    As competitor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={asMonitoredPage}
                    disabled={pending}
                  >
                    <Eye className="size-4" />
                    Track for changes
                  </Button>
                </>
              )}
            </div>

            {saveStatus.kind === "saved" && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                <CheckCircle2 className="size-3.5" />
                {saveStatus.message}
              </div>
            )}
            {saveStatus.kind === "error" && (
              <div className="flex items-center gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
                <AlertCircle className="size-3.5" />
                {saveStatus.message}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  isLink,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="text-sm">
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="truncate text-cyan-300 hover:underline"
          >
            {value.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="truncate">{value}</span>
        )}
      </dd>
    </div>
  );
}
