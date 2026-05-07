"use server";

import { z } from "zod";
import {
  extractSocialPreviews,
  type SocialPreview,
} from "@/lib/page-inspectors";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
});

export type SocialState =
  | { ok: true; result: SocialPreview }
  | { ok: false; error: string };

export async function runSocial(
  _prev: SocialState | null,
  formData: FormData,
): Promise<SocialState> {
  const parsed = schema.safeParse({ url: formData.get("url") });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid URL" };
  const r = await extractSocialPreviews(parsed.data.url);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  return { ok: true, result: r };
}
