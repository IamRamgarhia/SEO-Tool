"use server";

import { z } from "zod";
import { generateSchemaFromUrl, type SchemaGenResult } from "@/lib/ai-schema-gen";
import { saveToolRun } from "@/lib/tool-runs";

const inputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
});

export type AiSchemaState =
  | { ok: true; result: SchemaGenResult }
  | { ok: false; error: string };

export async function runAiSchema(
  _prev: AiSchemaState | null,
  formData: FormData,
): Promise<AiSchemaState> {
  const parsed = inputSchema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid URL" };
  }
  const r = await generateSchemaFromUrl({ url: parsed.data.url });
  if (!r.ok) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "ai-schema",
    label: parsed.data.url,
    input: { url: parsed.data.url },
    result: { ok: true, result: r },
  }).catch(() => undefined);
  return { ok: true, result: r };
}
