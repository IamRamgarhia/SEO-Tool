/**
 * SEO server-log analyzer. Parses Apache common / combined + Nginx access
 * logs. Surfaces crawl-budget analytics for Googlebot (and other search
 * bots) — what's being crawled, what's wasting budget, what's broken.
 *
 * No external service. Pure regex + aggregation. Caps lines processed at
 * 200k for memory safety.
 */

const MAX_LINES = 200_000;

const COMBINED_RE =
  /^(\S+) (\S+) (\S+) \[([^\]]+)\] "(\S+) (\S+) [^"]*" (\d+) (\d+|-)(?: "([^"]*)" "([^"]*)")?/;

export type LogEntry = {
  ip: string;
  ts: Date | null;
  method: string;
  path: string;
  status: number;
  bytes: number;
  referer: string;
  ua: string;
};

export type BotName =
  | "Googlebot"
  | "Googlebot-Image"
  | "Googlebot-Mobile"
  | "AdsBot-Google"
  | "Bingbot"
  | "DuckDuckBot"
  | "YandexBot"
  | "Baiduspider"
  | "Applebot"
  | "GPTBot"
  | "ClaudeBot"
  | "PerplexityBot"
  | "OAI-SearchBot"
  | "Google-Extended"
  | "CCBot";

const BOT_PATTERNS: { name: BotName; re: RegExp }[] = [
  { name: "Googlebot-Image", re: /Googlebot-Image/i },
  { name: "Googlebot-Mobile", re: /Googlebot-Mobile|Mobile.*Googlebot|Googlebot.*Mobile/i },
  { name: "AdsBot-Google", re: /AdsBot-Google/i },
  { name: "Googlebot", re: /Googlebot(?!-Image|-Mobile)/i },
  { name: "Bingbot", re: /bingbot/i },
  { name: "DuckDuckBot", re: /DuckDuckBot/i },
  { name: "YandexBot", re: /YandexBot/i },
  { name: "Baiduspider", re: /Baiduspider/i },
  { name: "Applebot", re: /Applebot/i },
  { name: "GPTBot", re: /GPTBot/i },
  { name: "ClaudeBot", re: /ClaudeBot|anthropic/i },
  { name: "PerplexityBot", re: /PerplexityBot|Perplexity-User/i },
  { name: "OAI-SearchBot", re: /OAI-SearchBot/i },
  { name: "Google-Extended", re: /Google-Extended/i },
  { name: "CCBot", re: /CCBot/i },
];

export type LogAnalysis = {
  totalLines: number;
  parsedLines: number;
  botLines: number;
  byBot: Record<string, number>;
  byStatus: Record<string, number>;
  topPaths: { path: string; hits: number; bytes: number }[];
  errorPaths: { path: string; status: number; hits: number }[];
  parameterPaths: { path: string; hits: number }[];
  hourly: { hour: string; hits: number }[];
  /** SEO insights derived from the analysis. */
  insights: string[];
  /** First and last timestamp in the log range. */
  range: { from: string | null; to: string | null };
};

export function parseLogLine(line: string): LogEntry | null {
  const m = line.match(COMBINED_RE);
  if (!m) return null;
  let ts: Date | null = null;
  try {
    // Apache format: 10/Oct/2025:13:55:36 -0700
    ts = parseApacheDate(m[4]);
  } catch {
    ts = null;
  }
  const status = Number(m[7]);
  const bytes = m[8] === "-" ? 0 : Number(m[8]);
  return {
    ip: m[1],
    ts,
    method: m[5],
    path: m[6],
    status: Number.isFinite(status) ? status : 0,
    bytes: Number.isFinite(bytes) ? bytes : 0,
    referer: m[9] ?? "",
    ua: m[10] ?? "",
  };
}

function parseApacheDate(raw: string): Date | null {
  // 10/Oct/2025:13:55:36 -0700
  const m = raw.match(
    /^(\d{1,2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/,
  );
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const mo = months[m[2]];
  if (!mo) return null;
  const iso = `${m[3]}-${mo}-${m[1].padStart(2, "0")}T${m[4]}:${m[5]}:${m[6]}${m[7].slice(0, 3)}:${m[7].slice(3)}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function detectBot(ua: string): BotName | null {
  for (const p of BOT_PATTERNS) {
    if (p.re.test(ua)) return p.name;
  }
  return null;
}

export function analyzeLogs(
  raw: string,
  opts: { botFilter?: "all" | "search-only" | "ai-only" } = {},
): LogAnalysis {
  const botFilter = opts.botFilter ?? "all";
  const lines = raw.split(/\r?\n/);
  const cap = Math.min(lines.length, MAX_LINES);

  const byBot: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const pathHits = new Map<string, { hits: number; bytes: number }>();
  const errorMap = new Map<string, { status: number; hits: number }>();
  const paramHits = new Map<string, number>();
  const hourly = new Map<string, number>();
  let parsedLines = 0;
  let botLines = 0;
  let firstTs: Date | null = null;
  let lastTs: Date | null = null;

  const isSearchBot = (b: BotName) =>
    /^(Googlebot|Googlebot-Mobile|Googlebot-Image|AdsBot-Google|Bingbot|DuckDuckBot|YandexBot|Baiduspider|Applebot)$/.test(
      b,
    );
  const isAiBot = (b: BotName) =>
    /^(GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot|Google-Extended|CCBot)$/.test(
      b,
    );

  for (let i = 0; i < cap; i++) {
    const e = parseLogLine(lines[i]);
    if (!e) continue;
    parsedLines += 1;
    const bot = detectBot(e.ua);
    if (!bot) continue;
    if (botFilter === "search-only" && !isSearchBot(bot)) continue;
    if (botFilter === "ai-only" && !isAiBot(bot)) continue;

    botLines += 1;
    byBot[bot] = (byBot[bot] ?? 0) + 1;
    const sBucket =
      e.status >= 500
        ? "5xx"
        : e.status >= 400
          ? "4xx"
          : e.status >= 300
            ? "3xx"
            : e.status >= 200
              ? "2xx"
              : "1xx";
    byStatus[sBucket] = (byStatus[sBucket] ?? 0) + 1;

    const cur = pathHits.get(e.path) ?? { hits: 0, bytes: 0 };
    cur.hits += 1;
    cur.bytes += e.bytes;
    pathHits.set(e.path, cur);

    if (e.status >= 400) {
      const k = `${e.path}|${e.status}`;
      const ec = errorMap.get(k) ?? { status: e.status, hits: 0 };
      ec.hits += 1;
      errorMap.set(k, ec);
    }

    if (e.path.includes("?")) {
      const base = e.path.split("?")[0];
      paramHits.set(base, (paramHits.get(base) ?? 0) + 1);
    }

    if (e.ts) {
      const hour = e.ts.toISOString().slice(0, 13);
      hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
      if (!firstTs || e.ts < firstTs) firstTs = e.ts;
      if (!lastTs || e.ts > lastTs) lastTs = e.ts;
    }
  }

  const topPaths = Array.from(pathHits.entries())
    .map(([p, v]) => ({ path: p, ...v }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 25);

  const errorPaths = Array.from(errorMap.entries())
    .map(([k, v]) => ({ path: k.split("|")[0], status: v.status, hits: v.hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 20);

  const parameterPaths = Array.from(paramHits.entries())
    .map(([p, hits]) => ({ path: p, hits }))
    .filter((r) => r.hits >= 3)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 12);

  const hourlyArr = Array.from(hourly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, hits]) => ({ hour, hits }));

  const insights = buildInsights({
    byBot,
    byStatus,
    topPaths,
    errorPaths,
    parameterPaths,
    botLines,
  });

  return {
    totalLines: lines.length,
    parsedLines,
    botLines,
    byBot,
    byStatus,
    topPaths,
    errorPaths,
    parameterPaths,
    hourly: hourlyArr,
    insights,
    range: {
      from: firstTs?.toISOString() ?? null,
      to: lastTs?.toISOString() ?? null,
    },
  };
}

function buildInsights(opts: {
  byBot: Record<string, number>;
  byStatus: Record<string, number>;
  topPaths: { path: string; hits: number; bytes: number }[];
  errorPaths: { path: string; status: number; hits: number }[];
  parameterPaths: { path: string; hits: number }[];
  botLines: number;
}): string[] {
  const out: string[] = [];

  if (opts.botLines === 0) {
    out.push(
      "No bot traffic detected — confirm the log includes bot requests, not just human traffic. Combined log format with the user-agent field is required.",
    );
    return out;
  }

  // Crawl budget waste: parameter URLs
  const totalParam = opts.parameterPaths.reduce((s, r) => s + r.hits, 0);
  if (totalParam > 0 && totalParam / opts.botLines > 0.15) {
    out.push(
      `${Math.round((totalParam / opts.botLines) * 100)}% of bot hits go to parameter URLs (${totalParam} / ${opts.botLines}). Add Disallow rules in robots.txt for known parameter patterns or canonicalize them — major crawl-budget waste.`,
    );
  }

  // Error rates
  const errPct = ((opts.byStatus["4xx"] ?? 0) + (opts.byStatus["5xx"] ?? 0)) / opts.botLines;
  if (errPct > 0.05) {
    out.push(
      `${Math.round(errPct * 100)}% of bot requests returned errors (4xx/5xx). Top broken URLs are listed below — fix or 301 them; Google reduces crawl rate when error rates climb.`,
    );
  }
  const fivexx = opts.byStatus["5xx"] ?? 0;
  if (fivexx > 5) {
    out.push(
      `${fivexx} 5xx server errors served to bots. Investigate server stability — repeated 5xx tells Google the site is fragile and slows crawling.`,
    );
  }

  // Top URL concentration
  const top5 = opts.topPaths.slice(0, 5).reduce((s, r) => s + r.hits, 0);
  if (top5 / opts.botLines > 0.5) {
    out.push(
      `${Math.round((top5 / opts.botLines) * 100)}% of crawl is concentrated in just 5 URLs. Some of that may be unwanted — check the top-paths list to make sure those are pages you want re-crawled often.`,
    );
  }

  // AI bot share
  const aiTotal =
    (opts.byBot["GPTBot"] ?? 0) +
    (opts.byBot["ClaudeBot"] ?? 0) +
    (opts.byBot["PerplexityBot"] ?? 0) +
    (opts.byBot["OAI-SearchBot"] ?? 0) +
    (opts.byBot["Google-Extended"] ?? 0);
  if (aiTotal > 0) {
    const pct = Math.round((aiTotal / opts.botLines) * 100);
    out.push(
      `AI bots are ${pct}% of bot traffic (GPTBot/ClaudeBot/Perplexity/OAI-Search/Google-Extended). If you don't want AI training, set Disallow rules in robots.txt for these UAs. If you DO want AI citations, leave them allowed — they need to crawl to cite you.`,
    );
  }

  if (out.length === 0) {
    out.push("Crawl pattern looks healthy — no major waste or error issues detected.");
  }
  return out;
}
