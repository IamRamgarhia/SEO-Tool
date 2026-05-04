/**
 * Smart-link redirector helpers. Generates URL-safe slugs, builds the
 * UTM-decorated destination URL, and provides a small set of helpers
 * the route handler + UI both rely on.
 */

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { shortLinks, shortLinkClicks, type ShortLink } from "@/db/schema";

const ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateSlug(length = 6): string {
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length];
  }
  return out;
}

export async function findUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = generateSlug(6 + Math.floor(attempt / 2));
    const [existing] = await db
      .select({ id: shortLinks.id })
      .from(shortLinks)
      .where(eq(shortLinks.slug, slug))
      .limit(1);
    if (!existing) return slug;
  }
  // Fallback to longer slug — collision after 6 attempts is astronomical
  return generateSlug(10);
}

export function buildDestinationUrl(link: ShortLink): string {
  let url: URL;
  try {
    url = new URL(link.destination);
  } catch {
    return link.destination;
  }
  const utm: [string, string | null][] = [
    ["utm_source", link.utmSource],
    ["utm_medium", link.utmMedium],
    ["utm_campaign", link.utmCampaign],
    ["utm_term", link.utmTerm],
    ["utm_content", link.utmContent],
  ];
  for (const [k, v] of utm) {
    if (v && v.length > 0) url.searchParams.set(k, v);
  }
  return url.toString();
}

/**
 * Record a click against a short link. Truncates the user-agent and
 * stores a country guess from the accept-language header so we never
 * hold raw IPs / fingerprintable data.
 */
export async function recordClick(opts: {
  shortLinkId: number;
  userAgent: string | null;
  referer: string | null;
  acceptLanguage: string | null;
}): Promise<void> {
  const ua = opts.userAgent?.slice(0, 200) ?? null;
  const ref = opts.referer?.slice(0, 500) ?? null;
  const country = guessCountryFromAcceptLanguage(opts.acceptLanguage);

  await db.insert(shortLinkClicks).values({
    shortLinkId: opts.shortLinkId,
    userAgent: ua,
    referer: ref,
    countryHint: country,
  });

  await db
    .update(shortLinks)
    .set({
      clickCount: sql`${shortLinks.clickCount} + 1`,
      lastClickAt: new Date(),
    })
    .where(eq(shortLinks.id, opts.shortLinkId));
}

/**
 * Cheap country guess from the first locale tag in `accept-language`.
 * "en-US,en;q=0.9" → "US". Returns null if no region is present.
 */
function guessCountryFromAcceptLanguage(al: string | null): string | null {
  if (!al) return null;
  const first = al.split(",")[0].trim();
  const m = first.match(/-([A-Z]{2})\b/i);
  return m ? m[1].toUpperCase() : null;
}
