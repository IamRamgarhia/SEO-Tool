/**
 * Chrome UX Report (CrUX) API — Google's public, anonymised real-user
 * monitoring data. Returns Core Web Vitals percentiles for any public
 * URL or origin from real Chrome users over the last 28 days.
 *
 * Free, requires an API key (same project as PageSpeed Insights). The key
 * is shared with the existing PageSpeed setting so users only configure
 * once.
 *
 * Docs: https://developer.chrome.com/docs/crux/api
 */

import { getPageSpeedKey } from "./pagespeed";

const ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

export type CruxFormFactor = "PHONE" | "DESKTOP" | "TABLET" | "ALL_FORM_FACTORS";

export type CruxMetricBucket = {
  /** Inclusive lower bound */
  start: number;
  /** Exclusive upper bound. null = unbounded (last bucket) */
  end: number | null;
  /** Density of users falling in this bucket, 0..1 */
  density: number;
};

export type CruxMetric = {
  /** Histogram of three buckets: good, needs-improvement, poor */
  histogram: CruxMetricBucket[];
  /** 75th-percentile value used for pass/fail thresholds. */
  p75: number;
};

export type CruxResult = {
  /** Whether the URL/origin had enough traffic to return data. */
  hasData: boolean;
  /** "url" or "origin" — what scope CrUX returned. */
  scope: "url" | "origin" | null;
  /** Form factor returned ("PHONE", "DESKTOP", or "ALL_FORM_FACTORS"). */
  formFactor: CruxFormFactor | null;
  /** Date range the data covers (start..end, YYYY-MM-DD). */
  collectionPeriod: { start: string; end: string } | null;
  metrics: {
    lcp?: CruxMetric;
    inp?: CruxMetric;
    cls?: CruxMetric;
    fcp?: CruxMetric;
    ttfb?: CruxMetric;
  };
  error?: string;
};

const METRIC_KEYS = [
  "largest_contentful_paint",
  "interaction_to_next_paint",
  "cumulative_layout_shift",
  "first_contentful_paint",
  "experimental_time_to_first_byte",
] as const;

/**
 * Query CrUX for either a specific URL (preferred) or, if that has no
 * data, the origin. Only origins or URLs with enough traffic produce
 * results; quiet pages return hasData=false (not an error).
 */
export async function fetchCruxData(opts: {
  url: string;
  formFactor?: CruxFormFactor;
}): Promise<CruxResult> {
  const formFactor = opts.formFactor ?? "PHONE";
  const key = await getPageSpeedKey();
  if (!key) {
    return {
      hasData: false,
      scope: null,
      formFactor: null,
      collectionPeriod: null,
      metrics: {},
      error: "CrUX API requires a Google API key (same as PageSpeed Insights). Add one in Settings.",
    };
  }

  // Try URL-level first; CrUX returns 404 if no data, in which case
  // fall back to origin-level which is more permissive.
  const urlResult = await queryCrux(key, {
    url: opts.url,
    formFactor,
  });
  if (urlResult.hasData) return urlResult;

  let origin: string;
  try {
    origin = new URL(opts.url).origin;
  } catch {
    return {
      hasData: false,
      scope: null,
      formFactor: null,
      collectionPeriod: null,
      metrics: {},
      error: "Invalid URL",
    };
  }
  return await queryCrux(key, { origin, formFactor });
}

/**
 * Fetch BOTH URL-level and origin-level CrUX data side-by-side. Origin-level
 * is what Google rolls into the page-experience ranking signal (28-day
 * window, all pages on the origin). A page can pass URL-level CWV and still
 * fail the ranking signal if the origin as a whole is slow.
 *
 * Returns:
 *   - urlScope: data for the exact URL (or hasData=false if not enough traffic)
 *   - originScope: data for the entire origin (almost always populated)
 *   - gap: per-metric difference between URL and origin (informational)
 */
export async function fetchCruxBothScopes(opts: {
  url: string;
  formFactor?: CruxFormFactor;
}): Promise<{
  urlScope: CruxResult;
  originScope: CruxResult;
  gap: { metric: string; urlP75: number; originP75: number; delta: number }[];
}> {
  const formFactor = opts.formFactor ?? "PHONE";
  const key = await getPageSpeedKey();
  let origin = "";
  try {
    origin = new URL(opts.url).origin;
  } catch {
    // Invalid URL — return error in both scopes
    const err: CruxResult = {
      hasData: false,
      scope: null,
      formFactor: null,
      collectionPeriod: null,
      metrics: {},
      error: "Invalid URL",
    };
    return { urlScope: err, originScope: err, gap: [] };
  }
  if (!key) {
    const err: CruxResult = {
      hasData: false,
      scope: null,
      formFactor: null,
      collectionPeriod: null,
      metrics: {},
      error:
        "CrUX API requires a Google API key (same as PageSpeed Insights).",
    };
    return { urlScope: err, originScope: err, gap: [] };
  }
  const [urlScope, originScope] = await Promise.all([
    queryCrux(key, { url: opts.url, formFactor }),
    queryCrux(key, { origin, formFactor }),
  ]);
  const gap: {
    metric: string;
    urlP75: number;
    originP75: number;
    delta: number;
  }[] = [];
  if (urlScope.hasData && originScope.hasData) {
    for (const m of ["lcp", "inp", "cls", "fcp", "ttfb"] as const) {
      const u = urlScope.metrics[m]?.p75;
      const o = originScope.metrics[m]?.p75;
      if (typeof u === "number" && typeof o === "number") {
        gap.push({ metric: m, urlP75: u, originP75: o, delta: o - u });
      }
    }
  }
  return { urlScope, originScope, gap };
}

async function queryCrux(
  key: string,
  body: { url?: string; origin?: string; formFactor: CruxFormFactor },
): Promise<CruxResult> {
  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...body,
        metrics: METRIC_KEYS,
      }),
    });
    if (res.status === 404) {
      return {
        hasData: false,
        scope: body.url ? "url" : "origin",
        formFactor: body.formFactor,
        collectionPeriod: null,
        metrics: {},
      };
    }
    if (!res.ok) {
      const txt = await res.text();
      return {
        hasData: false,
        scope: null,
        formFactor: null,
        collectionPeriod: null,
        metrics: {},
        error: `CrUX ${res.status}: ${txt.slice(0, 200)}`,
      };
    }
    const data = (await res.json()) as RawCruxResponse;
    return parseCruxResponse(data, body.url ? "url" : "origin");
  } catch (err) {
    return {
      hasData: false,
      scope: null,
      formFactor: null,
      collectionPeriod: null,
      metrics: {},
      error: (err as Error).message,
    };
  }
}

type RawHistogramBin = {
  start?: number;
  end?: number;
  density?: number;
};

type RawCruxResponse = {
  record?: {
    key?: { url?: string; origin?: string; formFactor?: CruxFormFactor };
    metrics?: Record<
      string,
      {
        histogram?: RawHistogramBin[];
        percentiles?: { p75?: number };
      }
    >;
    collectionPeriod?: {
      firstDate?: { year: number; month: number; day: number };
      lastDate?: { year: number; month: number; day: number };
    };
  };
};

function parseCruxResponse(
  data: RawCruxResponse,
  scope: "url" | "origin",
): CruxResult {
  if (!data.record) {
    return {
      hasData: false,
      scope,
      formFactor: null,
      collectionPeriod: null,
      metrics: {},
    };
  }
  const m = data.record.metrics ?? {};
  const cp = data.record.collectionPeriod;
  const fmt = (d?: { year: number; month: number; day: number }) =>
    d ? `${d.year}-${pad(d.month)}-${pad(d.day)}` : "";

  return {
    hasData: true,
    scope,
    formFactor: data.record.key?.formFactor ?? null,
    collectionPeriod: cp
      ? { start: fmt(cp.firstDate), end: fmt(cp.lastDate) }
      : null,
    metrics: {
      lcp: parseMetric(m.largest_contentful_paint),
      inp: parseMetric(m.interaction_to_next_paint),
      cls: parseMetric(m.cumulative_layout_shift),
      fcp: parseMetric(m.first_contentful_paint),
      ttfb: parseMetric(m.experimental_time_to_first_byte),
    },
  };
}

function parseMetric(
  raw:
    | {
        histogram?: RawHistogramBin[];
        percentiles?: { p75?: number };
      }
    | undefined,
): CruxMetric | undefined {
  if (!raw || !raw.histogram) return undefined;
  return {
    histogram: raw.histogram.map((b) => ({
      start: b.start ?? 0,
      end: b.end ?? null,
      density: b.density ?? 0,
    })),
    p75: raw.percentiles?.p75 ?? 0,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Re-exported from `crux-thresholds.ts` so server callers keep the same
 * import path. Client components should import from `crux-thresholds`
 * directly to avoid pulling in the server-only key fetcher.
 */
export { ratingForMetric } from "./crux-thresholds";
