"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  importCsv,
  previewCsv,
  type CsvPreview,
  type ImportResult,
} from "./actions";

const schemaLabel: Record<CsvPreview["schema"], string> = {
  clients: "Clients",
  keywords: "Keywords",
  outreach: "Outreach prospects",
  competitors: "Competitors",
  unknown: "Unknown — pick manually",
};

type Schema = CsvPreview["schema"];

export function CsvImportClient({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [schemaOverride, setSchemaOverride] = useState<Schema | "">("");
  const [clientId, setClientId] = useState<number>(clients[0]?.id ?? 0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const router = useRouter();

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result ?? "");
      setText(t);
      runPreview(t);
    };
    reader.readAsText(file);
  }

  function runPreview(t: string) {
    setError(null);
    setPreview(null);
    setResult(null);
    setSchemaOverride("");
    startTransition(async () => {
      const r = await previewCsv(t);
      if (r.ok) setPreview(r.preview);
      else setError(r.error);
    });
  }

  function runImport() {
    const schema = (schemaOverride || preview?.schema || "unknown") as Schema;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await importCsv({
        text,
        schema,
        clientId: schema === "clients" ? undefined : clientId,
      });
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  const effectiveSchema = (schemaOverride || preview?.schema || "unknown") as
    | Schema
    | "";

  return (
    <div className="space-y-5">
      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <Label className="text-sm">Upload or paste CSV</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[auto_1fr]">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              disabled={pending}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
            >
              <Upload className="size-4" />
              Choose file
            </Button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => text && runPreview(text)}
            placeholder="…or paste CSV content here"
            rows={6}
            disabled={pending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          />
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
            <AlertCircle className="size-3.5" />
            {error}
          </div>
        )}
      </section>

      {preview && (
        <section className="glass-apple relative overflow-hidden rounded-2xl">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 ring-1 ring-inset ring-cyan-500/30">
                  <FileUp className="size-2.5" />
                  Detected: {schemaLabel[preview.schema]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {preview.rowCount} row{preview.rowCount === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Headers: {preview.headers.join(", ")}
              </p>
            </div>
          </header>

          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="schema-override" className="text-xs">
                Wrong type?
              </Label>
              <select
                id="schema-override"
                value={schemaOverride}
                onChange={(e) =>
                  setSchemaOverride(e.target.value as Schema | "")
                }
                disabled={pending}
                className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Use detected ({schemaLabel[preview.schema]})</option>
                <option value="clients">Clients</option>
                <option value="keywords">Keywords</option>
                <option value="outreach">Outreach</option>
                <option value="competitors">Competitors</option>
              </select>

              {effectiveSchema && effectiveSchema !== "clients" && effectiveSchema !== "unknown" && clients.length > 0 && (
                <>
                  <Label htmlFor="client-pick" className="text-xs">
                    for client
                  </Label>
                  <select
                    id="client-pick"
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
                </>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg ring-1 ring-inset ring-white/[0.04]">
              <table className="w-full text-xs">
                <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {preview.headers.slice(0, 6).map((h) => (
                      <th key={h} className="px-3 py-1.5 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {preview.sample.map((row, i) => (
                    <tr key={i}>
                      {preview.headers.slice(0, 6).map((h) => (
                        <td
                          key={h}
                          className="truncate px-3 py-1.5 text-muted-foreground"
                          style={{ maxWidth: "200px" }}
                        >
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              onClick={runImport}
              disabled={pending || effectiveSchema === "unknown"}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Import {preview.rowCount} rows
                </>
              )}
            </Button>
          </div>
        </section>
      )}

      {result && result.ok && (
        <div className="glass-apple relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-300" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">
                Imported {result.inserted}{" "}
                {schemaLabel[result.schema as Schema]
                  ?.toLowerCase()
                  .replace("s", "")}
                {result.inserted === 1 ? "" : "s"}.
              </div>
              {result.skipped > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Skipped {result.skipped} row{result.skipped === 1 ? "" : "s"}
                  {result.errors.length > 0
                    ? `: ${result.errors.join("; ")}`
                    : "."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {result && !result.ok && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="mr-2 inline size-4" />
          {result.error}
        </div>
      )}
    </div>
  );
}
