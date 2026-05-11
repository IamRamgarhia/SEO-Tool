"use client";

import { useState, useTransition } from "react";
import {
  ExternalLink,
  Save,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
} from "lucide-react";
import { saveApiKey, saveOllamaUrl } from "./key-actions";
import { Button } from "@/components/ui/button";
import {
  PROVIDER_CATALOG,
  type Provider,
} from "@/lib/api-providers";

const tierConfig: Record<
  "free" | "free-tier" | "paid",
  { label: string; tone: string }
> = {
  free: {
    label: "FREE",
    tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  },
  "free-tier": {
    label: "FREE TIER",
    tone: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  },
  paid: {
    label: "PAID",
    tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  },
};

export function ApiKeysSection({
  configured,
  ollamaUrl,
}: {
  configured: Record<string, boolean>;
  ollamaUrl: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Most features work without any keys. AI features (executive summaries,
        chat assistant, OCR extraction, AI visibility tracking) need at least
        one provider key.{" "}
        <strong className="text-foreground">
          Free options listed first
        </strong>{" "}
        — start with Gemini or Groq if you&apos;re unsure.
      </p>

      <div className="space-y-3">
        {PROVIDER_CATALOG.map((p) => (
          <ProviderCard
            key={p.id}
            providerId={p.id === "ollama" ? undefined : (p.id as Provider)}
            isOllama={p.id === "ollama"}
            name={p.label}
            description={p.description}
            tier={p.tier}
            envVar={p.envVar}
            keyUrl={p.keyUrl}
            keyUrlLabel={p.keyUrlLabel}
            steps={p.steps}
            keyPrefix={p.keyPrefix}
            notes={p.notes}
            isConfigured={configured[p.id]}
            ollamaUrl={p.id === "ollama" ? ollamaUrl : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  providerId,
  name,
  description,
  tier,
  envVar,
  keyUrl,
  keyUrlLabel,
  steps,
  keyPrefix,
  notes,
  isConfigured,
  isOllama = false,
  ollamaUrl,
}: {
  providerId?: Provider;
  name: string;
  description: string;
  tier: "free" | "free-tier" | "paid";
  envVar: string;
  keyUrl: string;
  keyUrlLabel: string;
  steps: string[];
  keyPrefix?: string;
  notes?: string;
  isConfigured: boolean;
  isOllama?: boolean;
  ollamaUrl?: string;
}) {
  const tier_ = tierConfig[tier];
  const [value, setValue] = useState(isOllama ? (ollamaUrl ?? "") : "");
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | null
    | { ok: true; reply: string; elapsedMs: number }
    | { ok: false; error: string }
  >(null);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("value", value);
    startTransition(async () => {
      if (isOllama) {
        await saveOllamaUrl(formData);
      } else if (providerId) {
        await saveApiKey(providerId, formData);
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      // Clear any prior test result — the new key needs a fresh test
      setTestResult(null);
      // For paid/sensitive keys, blank the field after save so we don't
      // re-display it. Keep Ollama URL visible since it's not secret.
      if (!isOllama) setValue("");
    });
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-provider", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: providerId ?? "ollama" }),
      });
      const j = (await res.json()) as
        | { ok: true; reply: string; elapsedMs: number }
        | { ok: false; error: string };
      setTestResult(j);
    } catch (err) {
      setTestResult({
        ok: false,
        error: (err as Error).message || "Network error",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      id={`provider-${providerId ?? "ollama"}`}
      className={
        isConfigured
          ? "scroll-mt-20 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur"
          : "scroll-mt-20 rounded-xl border border-white/5 bg-black/20 backdrop-blur"
      }
    >
      {/* Header row — entire row is a link to the provider's key page */}
      <a
        href={keyUrl}
        target="_blank"
        rel="noreferrer"
        className="group/header flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-medium underline decoration-dotted decoration-violet-400/50 underline-offset-4 group-hover/header:decoration-violet-300">
            {name}
          </span>
          <ExternalLink className="size-3 text-muted-foreground group-hover/header:text-violet-300" />
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider ring-1 ring-inset ${tier_.tone}`}
          >
            {tier_.label}
          </span>
          {isConfigured && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <Check className="size-2.5" />
              Configured
            </span>
          )}
        </div>
        <span className="inline-flex h-7 items-center gap-1 rounded-md bg-violet-500/15 px-2.5 text-[11px] font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 group-hover/header:bg-violet-500/25">
          <ExternalLink className="size-3" />
          Get key from {keyUrlLabel}
        </span>
      </a>

      {/* Description + notes */}
      <div className="space-y-1.5 border-b border-white/5 px-4 py-3 text-xs">
        <p className="text-muted-foreground">{description}</p>
        {notes && (
          <p className="italic text-foreground/60 text-[11px]">{notes}</p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-2 border-b border-white/5 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          How to get a key
        </div>
        <ol className="space-y-1.5 text-[11px] leading-relaxed text-foreground/85">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300 ring-1 ring-inset ring-violet-500/30">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            placeholder={
              isOllama
                ? "http://localhost:11434"
                : isConfigured
                  ? "•••••••••• (key saved — paste a new one to replace)"
                  : keyPrefix
                    ? `Paste your ${name} key (starts with ${keyPrefix}…)`
                    : `Paste your ${name} key…`
            }
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={
              isConfigured && !value
                ? "flex h-9 flex-1 rounded-md border border-emerald-500/30 bg-emerald-500/[0.04] px-3 font-mono text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                : "flex h-9 flex-1 rounded-md border border-white/10 bg-card/60 px-3 font-mono text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            }
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide" : "Show"}
            className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
          >
            {show ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          </button>
          <Button
            type="submit"
            disabled={pending || (!value && !isConfigured)}
            size="sm"
            className="shadow-md shadow-violet-500/20"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : savedFlash ? (
              <Check className="size-3.5" />
            ) : (
              <Save className="size-3.5" />
            )}
            {savedFlash ? "Saved" : "Save"}
          </Button>
          {isConfigured && !value && (
            <Button
              type="button"
              onClick={runTest}
              disabled={testing}
              size="sm"
              variant="outline"
              className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
            >
              {testing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {testing ? "Testing…" : "Test"}
            </Button>
          )}
        </div>
        {testResult && (
          <div
            className={
              testResult.ok
                ? "rounded-md bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
                : "rounded-md bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30"
            }
          >
            {testResult.ok ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <Check className="size-3" />
                  <strong>Working.</strong> Replied in {testResult.elapsedMs}ms:
                </span>{" "}
                <span className="font-mono">
                  &quot;{testResult.reply.slice(0, 120)}&quot;
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  <strong>Test failed.</strong>
                </span>{" "}
                {testResult.error}
              </>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Stored locally in <code className="rounded bg-white/5 px-1 py-0.5">data.db</code>{" "}
          on this machine. You can also set environment variable{" "}
          <code className="rounded bg-white/5 px-1 py-0.5">{envVar}</code> as an alternative.
          {isConfigured && !value && (
            <>
              {" "}
              <strong>Already configured</strong> — paste a new key above to
              replace it, or leave blank and click Save to remove.
            </>
          )}
        </p>
      </form>
    </div>
  );
}
