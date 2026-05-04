"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { createShortLink, type CreateShortLinkResult } from "./actions";

export function CreateLinkForm({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    CreateShortLinkResult | null,
    FormData
  >(createShortLink, null);
  const [showUtm, setShowUtm] = useState(false);

  return (
    <form
      action={formAction}
      className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
    >
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Sparkles className="size-4 text-cyan-300" />
        Create short link
      </h2>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Destination URL</span>
          <input
            name="destination"
            required
            placeholder="https://yoursite.com/blog/post"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Label (optional)</span>
          <input
            name="label"
            placeholder="January newsletter"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">For client (optional)</span>
          <select
            name="clientId"
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            <option value="">Workspace-wide</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">
            Custom slug (optional — random by default)
          </span>
          <input
            name="customSlug"
            placeholder="jan-promo"
            pattern="[A-Za-z0-9_-]+"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowUtm(!showUtm)}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {showUtm ? "− Hide" : "+ Add"} UTM parameters
      </button>

      {showUtm && (
        <div className="grid gap-3 rounded-md bg-black/20 p-3 md:grid-cols-3">
          {(["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const).map(
            (key) => (
              <label key={key} className="space-y-1 text-xs">
                <span className="text-muted-foreground">
                  {key.replace(/^utm/, "utm_").toLowerCase()}
                </span>
                <input
                  name={key}
                  className="h-8 w-full rounded-md border border-white/10 bg-card/60 px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
            ),
          )}
        </div>
      )}

      {state && !state.ok && (
        <p className="text-xs text-rose-300">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-emerald-300">
          Created /r/<strong>{state.slug}</strong>
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create link"}
        </button>
      </div>
    </form>
  );
}
