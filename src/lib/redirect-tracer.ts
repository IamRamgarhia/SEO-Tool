/**
 * Trace a single URL's redirect chain. Returns each hop's status, target,
 * server, and final HTML status. Manual fetch with redirect: "manual" so
 * we see every step (not just the final).
 *
 * Bulk wrapper at the bottom — paste up to 100 URLs and trace each in
 * parallel (capped at 8 concurrent for politeness).
 */

const USER_AGENT =
  "Mozilla/5.0 (compatible; SeoToolBot/1.0; +https://example.com/bot)";

export type RedirectHop = {
  url: string;
  status: number;
  location: string | null;
  server: string | null;
  contentType: string | null;
};

export type RedirectChain = {
  startUrl: string;
  hops: RedirectHop[];
  finalUrl: string;
  finalStatus: number;
  hopCount: number;
  hadLoop: boolean;
  hadMixedScheme: boolean;
  totalLatencyMs: number;
  error?: string;
};

const MAX_HOPS = 10;
const HOP_TIMEOUT_MS = 8_000;

export async function traceRedirects(rawUrl: string): Promise<RedirectChain> {
  const start = Date.now();
  const startUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  const hops: RedirectHop[] = [];
  let current = startUrl;
  let hadLoop = false;
  const visited = new Set<string>();

  for (let i = 0; i < MAX_HOPS; i++) {
    if (visited.has(current)) {
      hadLoop = true;
      break;
    }
    visited.add(current);

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), HOP_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": USER_AGENT, accept: "text/html" },
        signal: ac.signal,
      });
    } catch (err) {
      hops.push({
        url: current,
        status: 0,
        location: null,
        server: null,
        contentType: null,
      });
      return {
        startUrl,
        hops,
        finalUrl: current,
        finalStatus: 0,
        hopCount: hops.length,
        hadLoop,
        hadMixedScheme: detectMixedScheme(hops),
        totalLatencyMs: Date.now() - start,
        error: (err as Error).message,
      };
    } finally {
      clearTimeout(t);
    }

    const status = res.status;
    const location = res.headers.get("location");
    hops.push({
      url: current,
      status,
      location,
      server: res.headers.get("server"),
      contentType: res.headers.get("content-type"),
    });

    // Drain body to free the connection
    try {
      await res.body?.cancel();
    } catch {
      // ignore
    }

    if (status >= 300 && status < 400 && location) {
      try {
        current = new URL(location, current).toString();
      } catch {
        break;
      }
      continue;
    }
    break;
  }

  return {
    startUrl,
    hops,
    finalUrl: hops[hops.length - 1]?.url ?? startUrl,
    finalStatus: hops[hops.length - 1]?.status ?? 0,
    hopCount: hops.length,
    hadLoop,
    hadMixedScheme: detectMixedScheme(hops),
    totalLatencyMs: Date.now() - start,
  };
}

function detectMixedScheme(hops: RedirectHop[]): boolean {
  const schemes = new Set<string>();
  for (const h of hops) {
    try {
      schemes.add(new URL(h.url).protocol);
    } catch {
      // ignore
    }
  }
  return schemes.size > 1;
}

export async function traceMany(
  urls: string[],
  concurrency = 8,
): Promise<RedirectChain[]> {
  const results: RedirectChain[] = [];
  const queue = urls.slice();

  async function worker() {
    while (queue.length > 0) {
      const u = queue.shift();
      if (!u) return;
      const r = await traceRedirects(u);
      results.push(r);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, worker),
  );
  // Preserve input order
  const orderMap = new Map<string, RedirectChain>();
  for (const r of results) orderMap.set(r.startUrl, r);
  return urls
    .map((u) => orderMap.get(/^https?:\/\//i.test(u) ? u : `https://${u}`))
    .filter((r): r is RedirectChain => Boolean(r));
}
