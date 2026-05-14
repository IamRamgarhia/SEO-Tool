/**
 * Read-only Playwright smoke test for the running SEO Tool.
 *
 * Goal: catch pages that 500 or render Next.js error overlays —
 * which usually means a server-side throw on first-render
 * (e.g. accessing an undefined client, missing schema column,
 * unawaited DB call).
 *
 * Run: pnpm exec node scripts/smoke-test.mjs http://localhost:3001
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";

const ROUTES = [
  "/",
  "/clients",
  "/clients/new",
  "/audits",
  "/keywords",
  "/tasks",
  "/content",
  "/backlinks",
  "/competitors",
  "/local-rank",
  "/ai-visibility",
  "/tools",
  "/settings",
  "/settings/ai-usage",
  "/settings/backup",
  "/settings/errors",
  "/settings/health",
  "/about",
  "/shortcuts",
  "/seo-chat",
  "/reports",
  "/automations",
  "/automations/overview",
  "/knowledge",
  "/learn",
  // Pick 8 random /tools/* to spot-check
  "/tools/schema",
  "/tools/hreflang",
  "/tools/sitemap",
  "/tools/robots",
  "/tools/headers",
  "/tools/meta-tag-generator",
  "/tools/cluster",
  "/tools/ads-funnel",
];

const results = {
  ok: [],
  redirect: [],
  fail: [],
};

async function main() {
  console.log(`Smoke-testing ${BASE} across ${ROUTES.length} routes...\n`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    const url = BASE + route;
    let status = 0;
    let title = "";
    let hasError = false;
    let consoleErrors = [];

    page.removeAllListeners("console");
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const txt = msg.text();
        // Ignore noisy non-issues
        if (
          !txt.includes("favicon") &&
          !txt.includes("DevTools") &&
          !txt.includes("404") &&
          !txt.includes("ResizeObserver")
        ) {
          consoleErrors.push(txt.slice(0, 200));
        }
      }
    });

    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      status = response?.status() ?? 0;
      title = await page.title();

      // Check for Next.js error overlay markers
      const errorOverlay = await page
        .locator(
          'nextjs-portal, [data-nextjs-dialog], [data-overlay-root], .__next-error',
        )
        .count();
      // Check for "Application error" / "500" text
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const errorTextPresent =
        /Application error|Server Error|500 \||500 \-/i.test(bodyText);

      hasError = errorOverlay > 0 || errorTextPresent;
    } catch (err) {
      status = -1;
      title = `(navigation failed: ${err.message.slice(0, 80)})`;
    }

    let label;
    if (status === 200 && !hasError && consoleErrors.length === 0) {
      label = "OK ";
      results.ok.push({ route, status, title });
    } else if (status >= 300 && status < 400) {
      label = "->>";
      results.redirect.push({ route, status, title });
    } else if (
      status === 200 &&
      !hasError &&
      consoleErrors.length > 0 &&
      consoleErrors.length <= 2
    ) {
      // Status 200 + minor console errors = soft pass
      label = "OK?";
      results.ok.push({ route, status, title, consoleErrors });
    } else {
      label = "X  ";
      results.fail.push({ route, status, title, hasError, consoleErrors });
    }

    const titleShort = (title ?? "").slice(0, 60);
    console.log(`  ${label} ${status.toString().padEnd(3)} ${route.padEnd(36)} ${titleShort}`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 2).forEach((e) =>
        console.log(`      console err: ${e}`),
      );
    }
  }

  await browser.close();

  console.log("\n========================================");
  console.log("SUMMARY");
  console.log("========================================");
  console.log(`OK         : ${results.ok.length}/${ROUTES.length}`);
  console.log(`Redirects  : ${results.redirect.length}`);
  console.log(`Failures   : ${results.fail.length}`);

  if (results.fail.length > 0) {
    console.log("\nFailures detail:");
    for (const f of results.fail) {
      console.log(
        `  ${f.route} -> status=${f.status} hasError=${f.hasError} title="${f.title}"`,
      );
      if (f.consoleErrors?.length) {
        f.consoleErrors.forEach((e) => console.log(`    console: ${e}`));
      }
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
