/**
 * Internal PageRank simulator. Crawls the site, builds the link graph,
 * runs the standard iterative PageRank algorithm with damping=0.85 for
 * 30 iterations. Surfaces:
 *
 *   - Pages with the highest computed PageRank (your "authority" pages)
 *   - Pages with the lowest PageRank that nonetheless have meaningful
 *     content — these are starved of internal links and worth promoting
 *   - Inbound vs outbound counts per page
 *
 * Distinct from /tools/link-graph which does TF-IDF orphan suggestions.
 */

import { crawlSite } from "./sitemap-generator";

const USER_AGENT =
  "Mozilla/5.0 (compatible; SeoToolBot/1.0; +https://example.com/bot)";

export type PageRankRow = {
  url: string;
  title: string;
  inbound: number;
  outbound: number;
  pagerank: number;
  /** PageRank as a percentage of the most-authoritative page. */
  pagerankPct: number;
};

export type PageRankResult = {
  ok: boolean;
  totalPages: number;
  totalLinks: number;
  iterations: number;
  damping: number;
  rows: PageRankRow[];
  starved: PageRankRow[];
  hubs: PageRankRow[];
  error?: string;
};

const ITERATIONS = 30;
const DAMPING = 0.85;

export async function simulatePageRank(opts: {
  startUrl: string;
  maxPages?: number;
}): Promise<PageRankResult> {
  const maxPages = Math.min(opts.maxPages ?? 150, 300);

  const { pages: crawled } = await crawlSite({
    startUrl: opts.startUrl,
    maxPages,
    maxDepth: 4,
    respectRobots: true,
  });

  let host = "";
  try {
    host = new URL(opts.startUrl).hostname;
  } catch {
    return empty("Invalid start URL.");
  }

  const knownUrls = new Set<string>();
  for (const p of crawled) {
    if (p.isHtml) knownUrls.add(canonicalize(p.url));
  }
  if (knownUrls.size === 0) {
    return empty("Crawl returned no HTML pages.");
  }

  // For each page, fetch HTML, parse outbound internal links + title
  const titles = new Map<string, string>();
  const adjacency = new Map<string, Set<string>>();
  for (const url of knownUrls) adjacency.set(url, new Set());

  await Promise.all(
    Array.from(knownUrls).map(async (u) => {
      const html = await fetchHtml(u);
      if (!html) return;
      const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      titles.set(u, titleM ? stripTags(titleM[1]).slice(0, 200) : u);
      for (const m of html.matchAll(
        /<a\s[^>]*href=["']([^"']+)["']/gi,
      )) {
        const href = m[1];
        if (!href || /^(javascript:|mailto:|tel:|#)/i.test(href)) continue;
        try {
          const abs = new URL(href, u);
          if (abs.hostname !== host) continue;
          const target = canonicalize(abs.toString());
          if (!knownUrls.has(target) || target === u) continue;
          adjacency.get(u)?.add(target);
        } catch {
          // ignore
        }
      }
    }),
  );

  // Iterative PageRank
  const N = knownUrls.size;
  const ranks = new Map<string, number>();
  for (const u of knownUrls) ranks.set(u, 1 / N);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const next = new Map<string, number>();
    for (const u of knownUrls) next.set(u, (1 - DAMPING) / N);
    for (const [u, outs] of adjacency.entries()) {
      const r = ranks.get(u) ?? 0;
      if (outs.size === 0) {
        // Dangling — distribute uniformly
        for (const v of knownUrls) {
          next.set(v, (next.get(v) ?? 0) + (DAMPING * r) / N);
        }
        continue;
      }
      const share = (DAMPING * r) / outs.size;
      for (const v of outs) {
        next.set(v, (next.get(v) ?? 0) + share);
      }
    }
    for (const u of knownUrls) ranks.set(u, next.get(u) ?? 0);
  }

  // Inbound counts
  const inbound = new Map<string, number>();
  for (const outs of adjacency.values()) {
    for (const v of outs) inbound.set(v, (inbound.get(v) ?? 0) + 1);
  }

  let maxRank = 0;
  for (const r of ranks.values()) if (r > maxRank) maxRank = r;

  const rows: PageRankRow[] = Array.from(knownUrls).map((u) => {
    const r = ranks.get(u) ?? 0;
    return {
      url: u,
      title: titles.get(u) ?? u,
      inbound: inbound.get(u) ?? 0,
      outbound: adjacency.get(u)?.size ?? 0,
      pagerank: r,
      pagerankPct: maxRank > 0 ? (r / maxRank) * 100 : 0,
    };
  });

  rows.sort((a, b) => b.pagerank - a.pagerank);

  const totalLinks = Array.from(adjacency.values()).reduce(
    (s, set) => s + set.size,
    0,
  );

  // Starved pages = bottom-quartile PR but more than ~150 chars of content
  // (we don't have content here — proxy by "has at least 1 outbound link", i.e.
  // the page actually rendered).
  const median = rows[Math.floor(rows.length / 2)]?.pagerank ?? 0;
  const starved = rows
    .filter((r) => r.pagerank < median * 0.4 && r.outbound > 0 && r.inbound <= 1)
    .slice(0, 25);
  const hubs = rows.slice(0, 15);

  return {
    ok: true,
    totalPages: N,
    totalLinks,
    iterations: ITERATIONS,
    damping: DAMPING,
    rows: rows.slice(0, 100),
    starved,
    hubs,
  };
}

function empty(error: string): PageRankResult {
  return {
    ok: false,
    totalPages: 0,
    totalLinks: 0,
    iterations: 0,
    damping: DAMPING,
    rows: [],
    starved: [],
    hubs: [],
    error,
  };
}

async function fetchHtml(url: string): Promise<string | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: ac.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html/i.test(ct)) return null;
    return (await res.text()).slice(0, 800_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function canonicalize(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const params = Array.from(u.searchParams.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    u.search = "";
    for (const [k, v] of params) u.searchParams.append(k, v);
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
