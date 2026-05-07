/**
 * Migration redirect-map generator. Hand it two URL lists (old + new) and
 * we pair every old URL with the best-match new URL using slug similarity
 * + path-segment overlap. Outputs a redirect map ready for nginx /
 * Apache / .htaccess / WordPress plugins.
 *
 * For lists where we can't find a confident match, we mark them as
 * "needs review" — those usually go to a 410 Gone or a category page.
 */

export type MapRow = {
  oldUrl: string;
  newUrl: string | null;
  /** 0–1 similarity score. */
  confidence: number;
  reason: string;
};

export type MigrationMap = {
  rows: MapRow[];
  /** Quick aggregates for the UI. */
  summary: {
    total: number;
    matched: number;
    review: number;
    avgConfidence: number;
  };
};

const STRONG = 0.85;
const WEAK = 0.5;

export function buildMigrationMap(opts: {
  oldUrls: string[];
  newUrls: string[];
}): MigrationMap {
  const olds = dedupe(opts.oldUrls.map(normalize));
  const news = dedupe(opts.newUrls.map(normalize));

  const newSlugs = news.map((u) => ({
    url: u,
    tokens: tokenizeUrl(u),
  }));

  const rows: MapRow[] = [];
  for (const oldUrl of olds) {
    const oldTok = tokenizeUrl(oldUrl);

    // Exact match (path-only)
    const exact = newSlugs.find((n) => samePath(n.url, oldUrl));
    if (exact) {
      rows.push({
        oldUrl,
        newUrl: exact.url,
        confidence: 1.0,
        reason: "Exact path match",
      });
      continue;
    }

    // Best fuzzy match
    let best: { url: string; score: number; reason: string } | null = null;
    for (const cand of newSlugs) {
      const score = similarity(oldTok, cand.tokens);
      if (!best || score > best.score) {
        best = {
          url: cand.url,
          score,
          reason: explainScore(oldTok, cand.tokens, score),
        };
      }
    }
    if (!best) {
      rows.push({
        oldUrl,
        newUrl: null,
        confidence: 0,
        reason: "No new URLs to compare against",
      });
      continue;
    }
    if (best.score >= STRONG) {
      rows.push({ oldUrl, newUrl: best.url, confidence: best.score, reason: best.reason });
    } else if (best.score >= WEAK) {
      rows.push({ oldUrl, newUrl: best.url, confidence: best.score, reason: `${best.reason} — review` });
    } else {
      rows.push({
        oldUrl,
        newUrl: null,
        confidence: best.score,
        reason: "No confident match — pick a category or 410",
      });
    }
  }

  const matched = rows.filter((r) => r.newUrl && r.confidence >= STRONG).length;
  const review = rows.filter((r) => r.newUrl && r.confidence >= WEAK && r.confidence < STRONG).length;
  const avg =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.confidence, 0) / rows.length
      : 0;

  return {
    rows,
    summary: { total: rows.length, matched, review, avgConfidence: avg },
  };
}

function normalize(raw: string): string {
  return raw.trim();
}

function dedupe(xs: string[]): string[] {
  return Array.from(new Set(xs)).filter(Boolean);
}

function samePath(a: string, b: string): boolean {
  try {
    const ua = new URL(/^https?:\/\//i.test(a) ? a : `https://x${a}`);
    const ub = new URL(/^https?:\/\//i.test(b) ? b : `https://x${b}`);
    return (
      ua.pathname.replace(/\/$/, "") === ub.pathname.replace(/\/$/, "") &&
      ua.search === ub.search
    );
  } catch {
    return a === b;
  }
}

function tokenizeUrl(url: string): { path: string; tokens: string[] } {
  let path = url;
  try {
    path = new URL(/^https?:\/\//i.test(url) ? url : `https://x${url}`).pathname;
  } catch {
    // ignore
  }
  const tokens = path
    .toLowerCase()
    .replace(/\.(html?|php|aspx?|jsp)$/, "")
    .split(/[\/\-_~,;:]+/)
    .filter((t) => t && t.length > 1);
  return { path, tokens };
}

function similarity(
  a: { path: string; tokens: string[] },
  b: { path: string; tokens: string[] },
): number {
  if (a.tokens.length === 0 && b.tokens.length === 0) return 0;
  const setA = new Set(a.tokens);
  const setB = new Set(b.tokens);
  // Jaccard on tokens
  const inter = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union === 0 ? 0 : inter / union;

  // Order-aware bonus: do they share the same last path segment?
  const lastA = a.tokens[a.tokens.length - 1] ?? "";
  const lastB = b.tokens[b.tokens.length - 1] ?? "";
  const tailBonus = lastA && lastA === lastB ? 0.2 : 0;

  // Path-depth penalty: very different depths shouldn't score high
  const depthDiff =
    Math.abs(a.tokens.length - b.tokens.length) /
    Math.max(1, Math.max(a.tokens.length, b.tokens.length));
  const depthPenalty = depthDiff * 0.15;

  return Math.max(0, Math.min(1, jaccard + tailBonus - depthPenalty));
}

function explainScore(
  a: { tokens: string[] },
  b: { tokens: string[] },
  s: number,
): string {
  const setA = new Set(a.tokens);
  const setB = new Set(b.tokens);
  const shared = [...setA].filter((t) => setB.has(t));
  if (shared.length === 0) return `Low similarity (${(s * 100).toFixed(0)}%)`;
  return `Shared: ${shared.slice(0, 4).join(", ")} (${(s * 100).toFixed(0)}%)`;
}

/**
 * Render a redirect map in nginx + Apache .htaccess + Next.js redirects()
 * + WordPress plugin format. Skips rows without a newUrl.
 */
export function renderRedirectMap(map: MigrationMap): {
  nginx: string;
  apache: string;
  nextjs: string;
} {
  const usable = map.rows.filter((r) => r.newUrl);

  const nginxLines = usable
    .map((r) => `rewrite ^${escapeNginxPath(pathOnly(r.oldUrl))}$ ${r.newUrl} permanent;`)
    .join("\n");

  const apacheLines = usable
    .map((r) => `Redirect 301 ${pathOnly(r.oldUrl)} ${r.newUrl}`)
    .join("\n");

  const nextLines = `module.exports = {\n  async redirects() {\n    return [\n${usable
    .map(
      (r) =>
        `      { source: ${JSON.stringify(pathOnly(r.oldUrl))}, destination: ${JSON.stringify(r.newUrl)}, permanent: true },`,
    )
    .join("\n")}\n    ];\n  },\n};`;

  return {
    nginx: nginxLines,
    apache: apacheLines,
    nextjs: nextLines,
  };
}

function pathOnly(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://x${url}`);
    return u.pathname + (u.search ?? "");
  } catch {
    return url;
  }
}

function escapeNginxPath(p: string): string {
  return p.replace(/[.+?$|()[\]\\]/g, "\\$&");
}
