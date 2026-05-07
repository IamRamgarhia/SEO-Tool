/**
 * Faceted-navigation crawl-trap detector.
 *
 * Common failure on e-commerce + listing sites: every filter combination
 * (color, size, brand, sort, price-range, page) generates a unique URL.
 * Multiplied across categories, this can balloon to millions of crawlable
 * URLs that:
 *
 *   - Burn crawl budget on near-duplicates
 *   - Compete for the same query (cannibalization)
 *   - Get indexed and degrade site quality signal
 *
 * Detection heuristic:
 *   1) Crawl up to N pages from the homepage / sitemap.
 *   2) Group URLs by their stripped-of-query "shape" (path + sorted param keys).
 *   3) Flag groups where:
 *      - many URLs share the same path but differ in query strings
 *      - the params look like filters (color, size, sort, price, brand,
 *        category, tag, view, page, per_page, etc.)
 *      - we found NO canonical / robots-noindex / disallow signal pointing
 *        away from these URLs
 *
 * The flagged groups are presented with the recommended fix for each.
 */

const USER_AGENT =
  "Mozilla/5.0 (compatible; seo-tool-facet-detector/1.0; +https://example.com)";

const FILTER_PARAM_HINTS = new Set([
  "color",
  "colour",
  "size",
  "brand",
  "category",
  "cat",
  "tag",
  "tags",
  "filter",
  "filters",
  "facet",
  "facets",
  "sort",
  "order",
  "orderby",
  "price",
  "price_min",
  "price_max",
  "min_price",
  "max_price",
  "view",
  "layout",
  "per_page",
  "perpage",
  "limit",
  "show",
  "rating",
  "availability",
  "instock",
  "in_stock",
  "material",
  "style",
  "gender",
  "age",
  "fit",
  "type",
]);

const PAGINATION_PARAMS = new Set(["page", "p", "pg", "start", "offset"]);

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "ref",
  "referrer",
  "source",
  "campaign",
]);

export type FacetGroup = {
  /** Path with sorted param keys, e.g. "/shop/shoes ?color&size" */
  shape: string;
  /** Distinct URLs sharing this shape */
  count: number;
  /** Sample 3 URLs */
  samples: string[];
  /** Detected param keys */
  params: string[];
  /** Whether the params look like filters (vs tracking / pagination only) */
  hasFilterParams: boolean;
  hasPaginationOnly: boolean;
  hasTrackingOnly: boolean;
  /** Canonical points elsewhere on at least one URL */
  hasCanonicalAway: boolean;
  /** Any URL has noindex meta or X-Robots-Tag */
  hasNoindex: boolean;
  /** Risk level. */
  risk: "low" | "medium" | "high";
  /** Recommendation per group. */
  recommendation: string;
};

export type FacetTrapReport = {
  domain: string;
  pagesScanned: number;
  groups: FacetGroup[];
  totalCrawlableUrls: number;
  uniqueShapes: number;
  /** Total unique URLs found that are facet-shaped. */
  facetUrlCount: number;
  /** Worst risk across all groups. */
  overall: "low" | "medium" | "high";
  summary: string;
};

async function fetchHtml(url: string, timeoutMs = 12_000): Promise<{
  html: string | null;
  noindex: boolean;
  canonical: string | null;
}> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return { html: null, noindex: false, canonical: null };
    const xRobots = res.headers.get("x-robots-tag") ?? "";
    const headerNoindex = /\bnoindex\b/i.test(xRobots);
    const html = (await res.text()).slice(0, 800_000);
    const metaNoindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    const canMatch = html.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    );
    return {
      html,
      noindex: headerNoindex || metaNoindex,
      canonical: canMatch?.[1] ?? null,
    };
  } catch {
    return { html: null, noindex: false, canonical: null };
  } finally {
    clearTimeout(t);
  }
}

function extractInternalLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  const baseHost = (() => {
    try {
      return new URL(base).hostname;
    } catch {
      return "";
    }
  })();
  const re = /<a[^>]*\shref=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) && out.size < 800) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname !== baseHost) continue;
      u.hash = "";
      out.add(u.toString());
    } catch {
      // ignore
    }
  }
  return Array.from(out);
}

function shapeOf(url: string): {
  shape: string;
  paramKeys: string[];
  path: string;
} {
  const u = new URL(url);
  const keys = Array.from(u.searchParams.keys()).sort();
  return {
    shape: keys.length > 0 ? `${u.pathname} ?${keys.join("&")}` : u.pathname,
    paramKeys: keys,
    path: u.pathname,
  };
}

function classifyParams(keys: string[]): {
  hasFilter: boolean;
  hasPaginationOnly: boolean;
  hasTrackingOnly: boolean;
} {
  const lower = keys.map((k) => k.toLowerCase());
  const filters = lower.filter(
    (k) => FILTER_PARAM_HINTS.has(k) || k.startsWith("filter_") || k.startsWith("facet_"),
  );
  const paginationLike = lower.filter((k) => PAGINATION_PARAMS.has(k));
  const trackingLike = lower.filter((k) => TRACKING_PARAMS.has(k));
  const hasFilter = filters.length > 0;
  const hasPaginationOnly =
    !hasFilter &&
    paginationLike.length > 0 &&
    paginationLike.length + trackingLike.length === lower.length;
  const hasTrackingOnly =
    !hasFilter && trackingLike.length === lower.length && lower.length > 0;
  return { hasFilter, hasPaginationOnly, hasTrackingOnly };
}

export async function detectFacetTraps(
  rootUrl: string,
  maxPages = 60,
): Promise<FacetTrapReport> {
  let domain = "";
  try {
    domain = new URL(rootUrl).hostname.replace(/^www\./, "");
  } catch {
    return {
      domain: "",
      pagesScanned: 0,
      groups: [],
      totalCrawlableUrls: 0,
      uniqueShapes: 0,
      facetUrlCount: 0,
      overall: "low",
      summary: "Invalid URL.",
    };
  }

  const seen = new Set<string>([rootUrl]);
  const groupsByShape = new Map<
    string,
    { urls: Set<string>; paramKeys: string[]; canonicalAway: boolean; noindex: boolean }
  >();

  const home = await fetchHtml(rootUrl);
  if (!home.html) {
    return {
      domain,
      pagesScanned: 0,
      groups: [],
      totalCrawlableUrls: 0,
      uniqueShapes: 0,
      facetUrlCount: 0,
      overall: "low",
      summary: `Couldn't fetch ${rootUrl}.`,
    };
  }
  const queue = extractInternalLinks(home.html, rootUrl).slice(0, maxPages);
  const pagesToFetch = [rootUrl, ...queue].slice(0, maxPages);
  const fetched: { url: string; noindex: boolean; canonical: string | null }[] = [];

  // Bound concurrency to avoid hammering the site
  const concurrency = 6;
  let idx = 0;
  async function worker() {
    while (idx < pagesToFetch.length) {
      const i = idx++;
      const u = pagesToFetch[i];
      if (!seen.has(u) && i > 0) continue; // dedupe
      seen.add(u);
      const r = i === 0
        ? home
        : await fetchHtml(u);
      if (!r.html) {
        fetched.push({ url: u, noindex: r.noindex, canonical: r.canonical });
        continue;
      }
      fetched.push({ url: u, noindex: r.noindex, canonical: r.canonical });
      // Collect more links from inner pages too — but only if it's a new shape
      // (avoids exploding the crawl on facet pages themselves)
      const sh = shapeOf(u).shape;
      if (
        groupsByShape.has(sh) &&
        (groupsByShape.get(sh)?.urls.size ?? 0) > 4
      ) {
        // already have plenty in this shape — skip extracting more links from it
        continue;
      }
      const links = extractInternalLinks(r.html, u);
      for (const l of links) {
        if (!seen.has(l) && pagesToFetch.length < maxPages * 4) {
          pagesToFetch.push(l);
        }
      }
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Group all fetched URLs by shape
  for (const f of fetched) {
    let shInfo: ReturnType<typeof shapeOf>;
    try {
      shInfo = shapeOf(f.url);
    } catch {
      continue;
    }
    if (shInfo.paramKeys.length === 0) continue; // skip clean URLs — they're fine
    const g = groupsByShape.get(shInfo.shape) ?? {
      urls: new Set<string>(),
      paramKeys: shInfo.paramKeys,
      canonicalAway: false,
      noindex: false,
    };
    g.urls.add(f.url);
    if (f.canonical && f.canonical !== f.url) g.canonicalAway = true;
    if (f.noindex) g.noindex = true;
    groupsByShape.set(shInfo.shape, g);
  }

  // Build report groups
  const groups: FacetGroup[] = [];
  let facetUrlCount = 0;
  for (const [shape, g] of groupsByShape) {
    if (g.urls.size < 1) continue;
    const cls = classifyParams(g.paramKeys);
    const count = g.urls.size;
    const isProblem = cls.hasFilter && count >= 2;
    let risk: FacetGroup["risk"] = "low";
    if (isProblem) {
      if (count >= 8 && !g.canonicalAway && !g.noindex) risk = "high";
      else if (count >= 3 && !g.canonicalAway && !g.noindex) risk = "medium";
      else if (g.canonicalAway || g.noindex) risk = "low";
      else risk = "medium";
    } else if (cls.hasTrackingOnly && count >= 5) {
      risk = "low"; // tracking params should be canonicalized but rarely cause indexation issues
    }

    let recommendation = "";
    if (cls.hasFilter && risk !== "low") {
      recommendation = `Add a self-referencing canonical pointing at the clean category URL (without filter params), set robots noindex,follow on filter URLs, and disallow common filter param patterns in robots.txt. Optionally, link-rel=nofollow internally to filter combinations.`;
    } else if (cls.hasPaginationOnly && count >= 3) {
      recommendation = `Pagination is fine — but ensure each /page/N has a self-referencing canonical, not pointing to /page/1. Use rel=next/prev only as a hint; Google treats them as informational.`;
    } else if (cls.hasTrackingOnly) {
      recommendation = `Tracking-param URLs should canonicalize to the clean URL. Confirm this with a single curl -I.`;
    } else if (cls.hasFilter && (g.canonicalAway || g.noindex)) {
      recommendation = `Already protected (${g.canonicalAway ? "canonical points away" : ""}${g.canonicalAway && g.noindex ? " + " : ""}${g.noindex ? "noindex set" : ""}). No action needed unless you see ranking issues.`;
    } else {
      recommendation = `Low risk for this group.`;
    }

    if (cls.hasFilter) facetUrlCount += count;

    groups.push({
      shape,
      count,
      samples: Array.from(g.urls).slice(0, 3),
      params: g.paramKeys,
      hasFilterParams: cls.hasFilter,
      hasPaginationOnly: cls.hasPaginationOnly,
      hasTrackingOnly: cls.hasTrackingOnly,
      hasCanonicalAway: g.canonicalAway,
      hasNoindex: g.noindex,
      risk,
      recommendation,
    });
  }
  groups.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    if (order[a.risk] !== order[b.risk]) return order[a.risk] - order[b.risk];
    return b.count - a.count;
  });

  const overall: "low" | "medium" | "high" = groups.some((g) => g.risk === "high")
    ? "high"
    : groups.some((g) => g.risk === "medium")
      ? "medium"
      : "low";

  let summary = "";
  if (overall === "low") {
    summary = `${domain}: no significant facet/filter URL traps detected in the sampled crawl.`;
  } else if (overall === "medium") {
    summary = `${domain}: a couple of filter-shaped URL groups found. Double-check that they have noindex or canonical-away signals.`;
  } else {
    summary = `${domain}: filter-driven URL explosion detected with no canonical/noindex protection. Crawl budget waste + cannibalization risk is real here.`;
  }

  return {
    domain,
    pagesScanned: fetched.length,
    groups,
    totalCrawlableUrls: fetched.length,
    uniqueShapes: groupsByShape.size,
    facetUrlCount,
    overall,
    summary,
  };
}
