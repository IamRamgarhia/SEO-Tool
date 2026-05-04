"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { shortLinks } from "@/db/schema";
import { findUniqueSlug } from "@/lib/short-links";
import { logActivity } from "@/lib/activity";

const createSchema = z.object({
  clientId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  destination: z
    .string()
    .trim()
    .min(1)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  label: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  customSlug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  utmSource: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  utmMedium: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  utmCampaign: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  utmTerm: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  utmContent: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateShortLinkResult =
  | { ok: true; id: number; slug: string }
  | { ok: false; error: string };

export async function createShortLink(
  _prev: CreateShortLinkResult | null,
  formData: FormData,
): Promise<CreateShortLinkResult> {
  const parsed = createSchema.safeParse({
    clientId: formData.get("clientId") || undefined,
    destination: formData.get("destination"),
    label: formData.get("label") ?? undefined,
    customSlug: formData.get("customSlug") ?? undefined,
    utmSource: formData.get("utmSource") ?? undefined,
    utmMedium: formData.get("utmMedium") ?? undefined,
    utmCampaign: formData.get("utmCampaign") ?? undefined,
    utmTerm: formData.get("utmTerm") ?? undefined,
    utmContent: formData.get("utmContent") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let slug = parsed.data.customSlug;
  if (slug) {
    const [existing] = await db
      .select({ id: shortLinks.id })
      .from(shortLinks)
      .where(eq(shortLinks.slug, slug))
      .limit(1);
    if (existing) {
      return {
        ok: false,
        error: `Slug "${slug}" is already taken — pick another.`,
      };
    }
  } else {
    slug = await findUniqueSlug();
  }

  const [row] = await db
    .insert(shortLinks)
    .values({
      clientId: parsed.data.clientId ?? null,
      slug,
      destination: parsed.data.destination,
      label: parsed.data.label ?? null,
      utmSource: parsed.data.utmSource ?? null,
      utmMedium: parsed.data.utmMedium ?? null,
      utmCampaign: parsed.data.utmCampaign ?? null,
      utmTerm: parsed.data.utmTerm ?? null,
      utmContent: parsed.data.utmContent ?? null,
    })
    .returning({ id: shortLinks.id });

  if (parsed.data.clientId) {
    await logActivity({
      kind: "task.created",
      message: `Created short link /r/${slug}`,
      clientId: parsed.data.clientId,
      entityType: "short_link",
      entityId: row.id,
    });
  }

  revalidatePath("/links");
  if (parsed.data.clientId)
    revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true, id: row.id, slug };
}

export async function deleteShortLink(id: number): Promise<void> {
  if (!Number.isFinite(id) || id <= 0) return;
  await db.delete(shortLinks).where(eq(shortLinks.id, id));
  revalidatePath("/links");
}
