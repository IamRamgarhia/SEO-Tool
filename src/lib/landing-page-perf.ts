/**
 * Landing-page performance tracker. Joins GSC (clicks/impressions/CTR)
 * with GA4 (sessions/conversions/revenue) per URL so we can find the
 * pages that get traffic but don't convert — typically the highest-
 * leverage pages to fix.
 */

import { fetchGscPerformance } from "./google-oauth";
import { fetchGa4OrganicByLandingPage } from "./google-oauth";

export type LandingPagePerf = {
  page: string;
  /** GSC: clicks last 28 days */
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** GA4: organic sessions to this URL last 28 days */
  sessions: number;
  conversions: number;
  revenue: number;
  /** Conversion rate as a fraction (0..1). null = no sessions */
  conversionRate: number | null;
  /** Score: clicks × (1 - conversionRate). High = traffic that doesn't convert. */
  fixScore: number;
};

function ymdMinus(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export async function loadLandingPagePerf(opts: {
  gscProperty: string;
  ga4PropertyId?: string | null;
  days?: number;
  limit?: number;
  clientIdScope?: number;
}): Promise<LandingPagePerf[]> {
  const days = opts.days ?? 28;
  const start = ymdMinus(days + 2);
  const end = ymdMinus(2);

  const [gscRows, ga4Rows] = await Promise.all([
    fetchGscPerformance({
      siteUrl: opts.gscProperty,
      startDate: start,
      endDate: end,
      dimensions: ["page"],
      rowLimit: opts.limit ?? 200,
      clientIdScope: opts.clientIdScope,
    }).catch(() => []),
    opts.ga4PropertyId
      ? fetchGa4OrganicByLandingPage({
          propertyId: opts.ga4PropertyId,
          startDate: ymdMinus(days),
          endDate: ymdMinus(0),
          rowLimit: 250,
          clientIdScope: opts.clientIdScope,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  // GA4's `landingPagePlusQueryString` is a path ("/blog/post"), GSC
  // returns a full URL. Index GA4 by both path and full-URL for a
  // permissive merge.
  const ga4ByPath = new Map<
    string,
    { sessions: number; conversions: number; revenue: number }
  >();
  for (const r of ga4Rows) {
    if (!r.landingPage) continue;
    ga4ByPath.set(r.landingPage, {
      sessions: r.sessions,
      conversions: r.conversions,
      revenue: r.revenue,
    });
  }

  const out: LandingPagePerf[] = [];
  for (const g of gscRows) {
    const fullUrl = g.keys[0] ?? "";
    if (!fullUrl) continue;
    let path = "";
    try {
      const u = new URL(fullUrl);
      path = u.pathname + (u.search || "");
    } catch {
      path = fullUrl;
    }
    const ga4 = ga4ByPath.get(path) ?? ga4ByPath.get(fullUrl) ?? null;
    const sessions = ga4?.sessions ?? 0;
    const conversions = ga4?.conversions ?? 0;
    const revenue = ga4?.revenue ?? 0;
    const conversionRate = sessions > 0 ? conversions / sessions : null;
    // High clicks + low conversion rate = juicy fix candidate
    const fixScore = Math.round(
      g.clicks * (1 - (conversionRate ?? 0)) * (g.clicks >= 50 ? 1 : 0.4),
    );
    out.push({
      page: fullUrl,
      clicks: g.clicks,
      impressions: g.impressions,
      ctr: g.ctr,
      position: g.position,
      sessions,
      conversions,
      revenue,
      conversionRate,
      fixScore,
    });
  }

  return out.sort((a, b) => b.fixScore - a.fixScore);
}
