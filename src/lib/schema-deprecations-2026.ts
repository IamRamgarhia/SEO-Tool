/**
 * March 2026 schema.org rich-result reductions.
 *
 * Google's March 2026 core update reduced or removed rich-result display for
 * several schema types that were widely abused on non-primary content pages.
 * The schema is still valid and may help with AI Mode entity verification,
 * but it no longer reliably triggers a rich SERP element on its own.
 *
 * Source: Google Search Central updates + community analysis (search query:
 * "Google retires structured data features 2026").
 */

export type SchemaAdvisory = {
  status: "ok" | "reduced" | "deprecated";
  /** Short headline shown above the JSON-LD output. */
  headline: string;
  /** Longer explanation for the user. */
  reason: string;
  /** What to do instead, if anything. */
  recommendation: string;
};

const ADVISORIES: Record<string, SchemaAdvisory> = {
  FAQPage: {
    status: "reduced",
    headline: "FAQ rich result rarely shown since March 2026",
    reason:
      "Google reduced FAQ rich-result display sharply in 2023 and again in March 2026 because it was over-used on non-primary pages. The markup is still valid and may help AI Mode entity verification, but expect no SERP rich element on most pages.",
    recommendation:
      "Use FAQPage schema only on pages that are genuinely organized as FAQs. For product/service pages with a few questions at the bottom, prefer Article + an in-page H2-and-paragraph structure — Google reads that natively.",
  },
  HowTo: {
    status: "reduced",
    headline: "HowTo rich result no longer shown for most queries",
    reason:
      "Google retired the HowTo rich result for most desktop and mobile queries in 2023 and removed it from Search Console reporting in 2026.",
    recommendation:
      "Use Article schema with clear H2-step headings instead. The content layout itself is what Google extracts now.",
  },
  Review: {
    status: "reduced",
    headline: "Review snippet pulled from non-primary pages",
    reason:
      "March 2026 reduced rich Review display on pages that aren't the primary subject of the review (e.g. star ratings on blog posts about a product the site doesn't sell or test).",
    recommendation:
      "Use Review/AggregateRating only on pages where the review IS the primary content (your own product pages, dedicated review pages). Don't sprinkle it across the site.",
  },
  Recipe: {
    status: "ok",
    headline: "Recipe schema still triggers rich results",
    reason: "Recipe rich results remain prominent and competitive.",
    recommendation:
      "Include image, prepTime, cookTime, totalTime, recipeIngredient, recipeInstructions, nutrition (where applicable). Author + datePublished add E-E-A-T signal.",
  },
  Article: {
    status: "ok",
    headline: "Article schema is highly recommended",
    reason:
      "Article schema is the foundation for AI Mode entity verification and the news/article carousel. With Google leaning on schema for AI trust signals in 2026, Article + author Person schema is now a top E-E-A-T signal.",
    recommendation:
      "Always pair Article with an embedded Person object for the author (with sameAs URLs to profiles), and keep datePublished/dateModified accurate.",
  },
  Product: {
    status: "ok",
    headline: "Product rich results still strong",
    reason:
      "Product schema remains a primary source for shopping rich results, AI shopping, and product knowledge panels.",
    recommendation:
      "Include offers (price/availability/priceValidUntil), aggregateRating from real reviews, brand, gtin/mpn/sku where you have them, and image. Avoid fake reviews — site-reputation abuse policy applies.",
  },
  LocalBusiness: {
    status: "ok",
    headline: "LocalBusiness schema is a top local SEO signal",
    reason:
      "LocalBusiness powers the Knowledge Panel, Maps results, and AI Overview local answers.",
    recommendation:
      "Match NAP exactly to GBP. Use the most specific subtype available (Restaurant, Plumber, Dentist) instead of generic LocalBusiness.",
  },
  Event: {
    status: "ok",
    headline: "Event rich results show in dedicated SERP carousels",
    reason: "Event schema continues to power event carousels on Google.",
    recommendation:
      "Include startDate, endDate, location (Place with address), organizer, eventStatus, eventAttendanceMode (online/offline/mixed).",
  },
  Organization: {
    status: "ok",
    headline: "Organization schema feeds Knowledge Panel + AI trust",
    reason:
      "Critical for brand entity recognition, Knowledge Panel, and AI source verification.",
    recommendation:
      "Include logo, sameAs (every social + Wikipedia/Crunchbase if listed), foundingDate, founders if relevant. Use 'name' that exactly matches your brand.",
  },
  // Types Google has explicitly retired/no longer reports on:
  Book: {
    status: "deprecated",
    headline: "Book Actions retired (returned in limited form)",
    reason:
      "Google removed Book Actions structured data from Search Console reports in 2026, then partially reinstated it after vendor pushback. Coverage is unreliable.",
    recommendation:
      "If you must use Book, also implement Article or Product fallbacks for the same page.",
  },
  ClaimReview: {
    status: "deprecated",
    headline: "ClaimReview support reduced in 2026",
    reason:
      "Google narrowed ClaimReview to a small set of approved fact-checking publishers; non-approved usage no longer triggers display.",
    recommendation:
      "Skip ClaimReview unless you're an established fact-checking publisher (registered with the IFCN or similar).",
  },
  Dataset: {
    status: "deprecated",
    headline: "Dataset removed from Search Console reports",
    reason:
      "Dataset rich-result reporting was retired in January 2026; markup is still valid but no longer surfaces in reporting.",
    recommendation:
      "Continue using Dataset for academic/research datasets; just don't expect Search Console visibility.",
  },
};

export function getSchemaAdvisory(type: string): SchemaAdvisory {
  return (
    ADVISORIES[type] ?? {
      status: "ok",
      headline: "No specific 2026 advisory for this type",
      reason: "",
      recommendation: "",
    }
  );
}

export const SCHEMA_ADVISORIES = ADVISORIES;
