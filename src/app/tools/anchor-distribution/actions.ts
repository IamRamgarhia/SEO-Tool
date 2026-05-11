"use server";

import { z } from "zod";
import {
  extractAnchorDistribution,
  type AnchorDistribution,
} from "@/lib/page-inspectors";
import { saveToolRun } from "@/lib/tool-runs";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  brandTerms: z.string().optional(),
  exactMatchTerms: z.string().optional(),
});

export type AnchorState =
  | { ok: true; result: AnchorDistribution }
  | { ok: false; error: string };

export async function runAnchor(
  _prev: AnchorState | null,
  formData: FormData,
): Promise<AnchorState> {
  const parsed = schema.safeParse({
    url: formData.get("url"),
    brandTerms: formData.get("brandTerms") ?? "",
    exactMatchTerms: formData.get("exactMatchTerms") ?? "",
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const brandTerms = (parsed.data.brandTerms ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const exactMatchTerms = (parsed.data.exactMatchTerms ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const r = await extractAnchorDistribution({
    url: parsed.data.url,
    brandTerms,
    exactMatchTerms,
  });
  if (!r.ok && r.error) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "anchor-distribution",
    label: parsed.data.url,
    input: parsed.data,
    result: { ok: true, result: r },
  }).catch(() => undefined);
  return { ok: true, result: r };
}
