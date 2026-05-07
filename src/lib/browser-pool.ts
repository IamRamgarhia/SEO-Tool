/**
 * Central headless-chromium pool. One Browser instance per process, contexts
 * created and torn down per task with three things every other browser-using
 * lib previously had to reinvent:
 *
 *   1. Concurrency cap — a semaphore so callers can `await withBrowserContext`
 *      without melting the box. Default 4, configurable in Settings.
 *   2. Stealth defaults — realistic UA, locale, timezone, viewport, hidden
 *      `navigator.webdriver`, removed automation banner. Avoids the cheap
 *      "looks like a bot" detection without pulling in playwright-extra.
 *   3. Optional proxy rotation — newline-separated proxy list in Settings,
 *      rotated round-robin per context. Useful for SERP scraping at volume.
 *
 * Existing callers (serp-scanner, rank-checker, gbp-scraper, local-rank) are
 * being migrated to use `withBrowserContext` so they share the same browser
 * + queue + stealth surface.
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type LaunchOptions,
} from "playwright";
import { getSetting } from "./settings-store";

const REALISTIC_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY_HARD_CAP = 16;

let cachedBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
let proxyCounter = 0;

// Simple semaphore.
let active = 0;
const waiters: Array<() => void> = [];

async function getMaxConcurrency(): Promise<number> {
  const raw = await getSetting<number | string>("browser.max_concurrency");
  const n = typeof raw === "number" ? raw : Number(raw ?? "");
  if (!Number.isFinite(n) || n < 1) return DEFAULT_CONCURRENCY;
  return Math.min(MAX_CONCURRENCY_HARD_CAP, Math.floor(n));
}

async function getProxies(): Promise<string[]> {
  const raw = await getSetting<string>("browser.proxies");
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function isStealthEnabled(): Promise<boolean> {
  const raw = await getSetting<boolean>("browser.stealth_enabled");
  return raw !== false; // default ON
}

export type StoredCookie = {
  domain: string;
  name: string;
  value: string;
  path?: string;
  expires?: number;
  secure?: boolean;
  httpOnly?: boolean;
};

async function getStoredCookies(): Promise<StoredCookie[]> {
  const raw = await getSetting<StoredCookie[]>("browser.cookies");
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c) =>
      c &&
      typeof c.domain === "string" &&
      typeof c.name === "string" &&
      typeof c.value === "string",
  );
}

async function acquire(): Promise<void> {
  const max = await getMaxConcurrency();
  if (active < max) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  active += 1;
}

function release() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) return cachedBrowser;
  if (!browserPromise) {
    const opts: LaunchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-features=IsolateOrigins,site-per-process",
        "--no-first-run",
        "--no-default-browser-check",
      ],
    };
    browserPromise = chromium.launch(opts);
  }
  cachedBrowser = await browserPromise;
  // If browser ever disconnects, clear the cache so next call re-launches.
  cachedBrowser.on("disconnected", () => {
    cachedBrowser = null;
    browserPromise = null;
  });
  return cachedBrowser;
}

function nextProxy(proxies: string[]): string | null {
  if (proxies.length === 0) return null;
  const idx = proxyCounter % proxies.length;
  proxyCounter += 1;
  return proxies[idx];
}

function parseProxy(raw: string): {
  server: string;
  username?: string;
  password?: string;
} | null {
  // Accept "host:port", "http://host:port", "http://user:pass@host:port",
  // "socks5://host:port".
  try {
    const withScheme = /:\/\//.test(raw) ? raw : `http://${raw}`;
    const u = new URL(withScheme);
    const out: { server: string; username?: string; password?: string } = {
      server: `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`,
    };
    if (u.username) out.username = decodeURIComponent(u.username);
    if (u.password) out.password = decodeURIComponent(u.password);
    return out;
  } catch {
    return null;
  }
}

export type WithContextOptions = {
  /** Override viewport. Default 1280x1800 for full-page captures. */
  viewport?: { width: number; height: number };
  /** Override locale. Default "en-US". */
  locale?: string;
  /** Override timezone. Default "UTC". */
  timezoneId?: string;
  /** Override user-agent. Default = realistic Chrome 130. */
  userAgent?: string;
  /** Pass-through accept-language header. */
  acceptLanguage?: string;
  /**
   * Force-disable proxy rotation for this call (e.g. when calling a
   * proxy-incompatible internal endpoint).
   */
  noProxy?: boolean;
};

/**
 * Acquire a context, run `fn`, release everything. Use this for ANY new
 * browser work — you get the queue, stealth, and proxy rotation for free.
 *
 * `fn` receives a fresh BrowserContext, NOT a Page — make pages yourself
 * so you control timeouts and counts.
 */
export async function withBrowserContext<T>(
  fn: (ctx: BrowserContext) => Promise<T>,
  opts: WithContextOptions = {},
): Promise<T> {
  await acquire();
  let context: BrowserContext | null = null;
  try {
    const browser = await getBrowser();
    const stealth = await isStealthEnabled();
    const proxies = opts.noProxy ? [] : await getProxies();
    const proxyRaw = nextProxy(proxies);
    const proxy = proxyRaw ? parseProxy(proxyRaw) : null;

    context = await browser.newContext({
      userAgent: opts.userAgent ?? REALISTIC_UA,
      viewport: opts.viewport ?? { width: 1280, height: 1800 },
      locale: opts.locale ?? "en-US",
      timezoneId: opts.timezoneId ?? "UTC",
      extraHTTPHeaders: {
        "accept-language": opts.acceptLanguage ?? "en-US,en;q=0.9",
      },
      ...(proxy ? { proxy } : {}),
    });

    // Inject cookies if any are stored (for logged-in scrapes / paywalls)
    const cookies = await getStoredCookies();
    if (cookies.length > 0) {
      try {
        await context.addCookies(
          cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path ?? "/",
            ...(c.expires ? { expires: c.expires } : {}),
            secure: c.secure ?? true,
            httpOnly: c.httpOnly ?? false,
            sameSite: "Lax" as const,
          })),
        );
      } catch {
        // bad cookie shape — skip silently rather than blocking the call
      }
    }

    if (stealth) {
      // Lightweight stealth: hide the things headless flags trip on.
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
        // Plugins length > 0 (real chrome usually has 3+ default plugins)
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        // languages array (real browsers have 2+)
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en"],
        });
        // Permissions API quirk — headless returns "denied" for notifications,
        // real chrome returns "default".
        const orig = (navigator as Navigator & { permissions?: { query?: unknown } })
          .permissions?.query;
        if (orig && navigator.permissions) {
          const q = orig as (
            params: PermissionDescriptor,
          ) => Promise<PermissionStatus>;
          navigator.permissions.query = (
            parameters: PermissionDescriptor,
          ): Promise<PermissionStatus> =>
            parameters.name === "notifications"
              ? Promise.resolve({ state: "default" } as unknown as PermissionStatus)
              : q.call(navigator.permissions, parameters);
        }
        // window.chrome stub (headless lacks it)
        if (!(window as unknown as { chrome?: unknown }).chrome) {
          (window as unknown as { chrome: unknown }).chrome = { runtime: {} };
        }
      });
    }

    return await fn(context);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    release();
  }
}

/**
 * Quick-and-dirty: run something with a single page already open. Most
 * single-URL lookups want this shape. Closes the page and the context.
 */
export async function withBrowserPage<T>(
  fn: (page: import("playwright").Page) => Promise<T>,
  opts: WithContextOptions = {},
): Promise<T> {
  return withBrowserContext(async (ctx) => {
    const page = await ctx.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close().catch(() => {});
    }
  }, opts);
}

/**
 * Health-check every configured proxy by making a quick HEAD request to
 * a tiny known-good URL through it. Returns per-proxy ok/latency/error
 * for the Settings UI.
 */
export type ProxyHealth = {
  raw: string;
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
};

export async function checkProxyHealth(): Promise<ProxyHealth[]> {
  const proxies = await getProxies();
  if (proxies.length === 0) return [];
  const browser = await getBrowser();
  const stealth = await isStealthEnabled();

  return Promise.all(
    proxies.map(async (raw): Promise<ProxyHealth> => {
      const proxy = parseProxy(raw);
      if (!proxy) {
        return { raw, ok: false, latencyMs: null, error: "Unparseable proxy" };
      }
      const start = Date.now();
      let context: BrowserContext | null = null;
      try {
        context = await browser.newContext({
          userAgent: REALISTIC_UA,
          viewport: { width: 800, height: 600 },
          proxy,
          ...(stealth ? {} : {}),
        });
        const page = await context.newPage();
        const resp = await page.goto("https://api.ipify.org/?format=json", {
          waitUntil: "domcontentloaded",
          timeout: 10_000,
        });
        if (!resp || !resp.ok()) {
          return {
            raw,
            ok: false,
            latencyMs: Date.now() - start,
            error: `HTTP ${resp?.status() ?? "no response"}`,
          };
        }
        return { raw, ok: true, latencyMs: Date.now() - start, error: null };
      } catch (err) {
        return {
          raw,
          ok: false,
          latencyMs: Date.now() - start,
          error: (err as Error).message,
        };
      } finally {
        if (context) await context.close().catch(() => {});
      }
    }),
  );
}

/** Diagnostics — read by Settings UI to surface current pool state. */
export function poolStats() {
  return {
    active,
    queued: waiters.length,
    proxyCounter,
    browserConnected: !!(cachedBrowser && cachedBrowser.isConnected()),
  };
}

/**
 * Force-close the cached browser. Call from Settings if a user changes
 * proxy / stealth / concurrency settings — the next call gets a fresh
 * browser with new defaults.
 */
export async function closeBrowser(): Promise<void> {
  const b = cachedBrowser;
  cachedBrowser = null;
  browserPromise = null;
  if (b && b.isConnected()) {
    await b.close().catch(() => {});
  }
}
