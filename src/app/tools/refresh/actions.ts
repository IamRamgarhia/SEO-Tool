"use server";

import { z } from "zod";
import { detectRefresh, type RefreshPlan } from "@/lib/refresh-detector";
import { saveToolRun } from "@/lib/tool-runs";

const inputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  targetKeyword: z.string().trim().min(2).max(200),
  country: z.string().trim().min(2).max(8).default("US"),
});

export type RefreshState =
  | { ok: true; plan: RefreshPlan }
  | { ok: false; error: string };

export async function runRefresh(
  _prev: RefreshState | null,
  formData: FormData,
): Promise<RefreshState> {
  const parsed = inputSchema.safeParse({
    url: formData.get("url"),
    targetKeyword: formData.get("targetKeyword"),
    country: formData.get("country") || "US",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const plan = await detectRefresh({
      url: parsed.data.url,
      targetKeyword: parsed.data.targetKeyword,
      country: parsed.data.country,
    });
    await saveToolRun({
      toolId: "refresh",
      label: `${parsed.data.url} · "${parsed.data.targetKeyword}"`,
      input: parsed.data,
      result: { ok: true, plan },
    }).catch(() => undefined);
    return { ok: true, plan };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Refresh detection failed" };
  }
}
