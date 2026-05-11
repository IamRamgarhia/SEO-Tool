/**
 * Plain-language explanations for every audit issue type, indexed by the
 * `type` string the crawler emits. Each entry has:
 *
 *   - whatIsIt: 1-2 sentences explaining the issue in plain words
 *   - whyItMatters: 1-2 sentences on the SEO impact (linking to Google's
 *     own documentation where possible)
 *   - howToFix: 2-4 bullet steps
 *   - confidence: how sure we are this is worth fixing
 *   - googleDoc: link to the canonical Google source if any
 *   - externalTool: a pre-filled URL to a free Google tool that validates
 *     the fix
 *
 * Used by the "Why does this matter?" expandable on every issue card and
 * by the "Fix it for me" wizard.
 */

export type IssueExplainer = {
  whatIsIt: string;
  whyItMatters: string;
  howToFix: string[];
  confidence: "definitely" | "probably" | "test";
  googleDoc?: string;
  externalTool?: (params: { url?: string }) => { label: string; href: string };
};

export const ISSUE_EXPLAINERS: Record<string, IssueExplainer> = {
  missing_title: {
    whatIsIt:
      "This page has no <title> tag. Google uses your title for the blue clickable headline in search results.",
    whyItMatters:
      "Without a title, Google may invent one from page content, often badly. Click-through rate drops 30-60% with auto-generated titles.",
    howToFix: [
      "Add a unique 50-60 character <title> in the <head>.",
      "Lead with the primary keyword, end with brand.",
      "Make it descriptive of THIS page, not the site overall.",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/appearance/title-link",
    externalTool: ({ url }) =>
      url
        ? {
            label: "Check in Google's URL Inspection tool",
            href: `https://search.google.com/search-console/inspect?utf8=%E2%9C%93&resource_id=&action=inspect&id=${encodeURIComponent(
              url,
            )}`,
          }
        : { label: "Google Search Console", href: "https://search.google.com/search-console" },
  },
  title_too_long: {
    whatIsIt:
      "Your <title> is longer than ~60 characters and Google is likely truncating it in search results.",
    whyItMatters:
      "Truncated titles end mid-word with '…' and often hide the keyword that triggered the search. CTR drops 5-15% per character lost.",
    howToFix: [
      "Trim to 50-60 characters max.",
      "Cut adjectives, brand names, and stop words.",
      "Test in our Google preview before publishing.",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/appearance/title-link",
  },
  title_too_short: {
    whatIsIt:
      "Your <title> is fewer than ~30 characters and isn't using the space Google gives you.",
    whyItMatters:
      "Short titles miss keyword-match opportunities and look thin in SERPs next to fuller competitor titles.",
    howToFix: [
      "Aim for 50-60 characters.",
      "Add one descriptive modifier (location, year, audience).",
      "Don't pad with keyword spam — Google will rewrite it.",
    ],
    confidence: "probably",
  },
  missing_meta_description: {
    whatIsIt:
      "This page has no <meta name=\"description\"> tag. Google may pull a snippet from random page text instead.",
    whyItMatters:
      "A good description acts as ad copy in search results. Pages without one have 5-10% lower CTR on average.",
    howToFix: [
      "Add a 140-160 character <meta name=\"description\"> in the <head>.",
      "Include the primary keyword naturally + a value prop.",
      "Make it action-oriented (start with a verb).",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/appearance/snippet#meta-descriptions",
  },
  meta_description_too_long: {
    whatIsIt:
      "Your meta description exceeds ~160 characters and Google is cutting it off mid-sentence.",
    whyItMatters:
      "Truncated descriptions lose the call-to-action at the end. CTR impact is small but compounds across thousands of impressions.",
    howToFix: [
      "Trim to 140-160 characters.",
      "Put the keyword + value prop in the first 120 chars.",
      "End with a clear CTA.",
    ],
    confidence: "definitely",
  },
  missing_h1: {
    whatIsIt:
      "This page has no <h1> heading. The H1 tells Google AND users what the page is about.",
    whyItMatters:
      "Pages without an H1 rank weaker because Google relies more on title + content guessing. Accessibility tools also break.",
    howToFix: [
      "Add a single <h1> at the top of the main content area.",
      "Match it to user intent for the target keyword.",
      "Differ from the <title> by 10-20 characters for variety.",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/fundamentals/seo-starter-guide#headings",
  },
  multiple_h1: {
    whatIsIt:
      "This page has more than one <h1> tag. While HTML5 technically allows this, it weakens topical clarity.",
    whyItMatters:
      "Multiple H1s split the page's primary topic signal. Google says it's OK but most ranked pages have exactly one.",
    howToFix: [
      "Keep the most important H1 — usually the page title.",
      "Convert the rest to H2 or H3 based on hierarchy.",
    ],
    confidence: "probably",
    googleDoc:
      "https://developers.google.com/search/docs/fundamentals/seo-starter-guide#headings",
  },
  missing_alt: {
    whatIsIt:
      "Images on this page have no alt attribute. Alt text describes images for screen readers AND Google's image search.",
    whyItMatters:
      "Missing alt text is an accessibility (WCAG AA) violation and forfeits free traffic from Google Image search.",
    howToFix: [
      "Add descriptive alt='' to every meaningful image.",
      "Decorative images can use alt='' (empty) to be ignored by screen readers.",
      "Don't keyword-stuff — describe what the image actually shows.",
    ],
    confidence: "definitely",
    googleDoc: "https://developers.google.com/search/docs/appearance/google-images",
  },
  broken_link: {
    whatIsIt:
      "This page links to a URL that returns 404 or other error status.",
    whyItMatters:
      "Broken internal links waste crawl budget. Broken external links degrade trust signal — Google's QRG flags it as a low-quality marker.",
    howToFix: [
      "Update the link to the correct current URL.",
      "Or remove it if the destination no longer exists.",
      "For external dead links, swap to an archived version (Wayback) when relevant.",
    ],
    confidence: "definitely",
  },
  redirect_chain: {
    whatIsIt:
      "This URL redirects through 2+ hops before landing. Each redirect adds latency and loses a tiny bit of PageRank.",
    whyItMatters:
      "Google honors only ~5 redirects then gives up. Mobile users abandon at the 2nd redirect's loading spinner.",
    howToFix: [
      "Point the original URL directly to the final destination.",
      "Delete the intermediate redirect.",
      "Audit your .htaccess or redirect manager for chains.",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/crawling-indexing/301-redirects",
  },
  missing_canonical: {
    whatIsIt:
      "This page has no <link rel=\"canonical\"> tag declaring which version Google should index.",
    whyItMatters:
      "Without an explicit canonical, Google guesses. It often picks wrongly when query params or trailing slashes create near-duplicate URLs.",
    howToFix: [
      "Add <link rel=\"canonical\" href=\"https://...self-referencing URL\">.",
      "Use absolute URLs, not relative.",
      "Match exactly — including protocol + trailing slash.",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
  },
  conflicting_canonical: {
    whatIsIt:
      "The canonical tag points to a different URL than the one being crawled, creating ambiguity.",
    whyItMatters:
      "Google may de-index this page entirely if the canonical loops or contradicts other signals (sitemap, internal links).",
    howToFix: [
      "Verify the canonical URL is the one you actually want indexed.",
      "Make sure sitemap + internal links point to the canonical version.",
      "Remove the canonical if the page should self-canonicalize.",
    ],
    confidence: "definitely",
  },
  missing_schema: {
    whatIsIt:
      "No structured data (JSON-LD schema.org) found on this page.",
    whyItMatters:
      "Schema unlocks rich results — star ratings, recipe cards, FAQ accordions, breadcrumbs — which boost CTR up to 35%.",
    howToFix: [
      "Pick the schema type matching your content (Article, Product, FAQPage, etc.).",
      "Use our schema generator tool to produce valid JSON-LD.",
      "Validate with Google's Rich Results Test before publishing.",
    ],
    confidence: "probably",
    googleDoc:
      "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    externalTool: ({ url }) => ({
      label: "Test in Google's Rich Results Test",
      href: url
        ? `https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`
        : "https://search.google.com/test/rich-results",
    }),
  },
  slow_lcp: {
    whatIsIt:
      "Largest Contentful Paint (LCP) is over 2.5 seconds — the main content takes too long to render.",
    whyItMatters:
      "LCP is one of three Core Web Vitals Google uses as a ranking signal. Pages failing CWV get a small but real ranking penalty in competitive markets.",
    howToFix: [
      "Preload the LCP image with <link rel=\"preload\">.",
      "Compress + serve WebP/AVIF, not PNG/JPEG.",
      "Defer non-critical CSS/JS that blocks rendering.",
      "Upgrade hosting if TTFB exceeds 800ms.",
    ],
    confidence: "definitely",
    googleDoc: "https://web.dev/articles/lcp",
    externalTool: ({ url }) => ({
      label: "Test in PageSpeed Insights",
      href: url
        ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`
        : "https://pagespeed.web.dev/",
    }),
  },
  poor_cls: {
    whatIsIt:
      "Cumulative Layout Shift (CLS) is over 0.1 — visible elements move around as the page loads.",
    whyItMatters:
      "CLS is a Core Web Vitals signal. Worse: users tap wrong buttons because layout shifted, hurting conversion.",
    howToFix: [
      "Add width + height attributes to every <img> and <video>.",
      "Reserve space for ads + embeds with min-height.",
      "Avoid inserting content above existing content (e.g. cookie banners).",
    ],
    confidence: "definitely",
    googleDoc: "https://web.dev/articles/cls",
  },
  poor_inp: {
    whatIsIt:
      "Interaction to Next Paint (INP) is over 200ms — clicks and taps feel laggy.",
    whyItMatters:
      "INP replaced FID as a Core Web Vital in March 2024. Sites in the bottom 25% of INP lose ~10% organic traffic.",
    howToFix: [
      "Break long JavaScript tasks into chunks with setTimeout or requestIdleCallback.",
      "Defer third-party scripts (analytics, ads).",
      "Optimize React: use useMemo for heavy renders, lazy-load below-the-fold components.",
    ],
    confidence: "definitely",
    googleDoc: "https://web.dev/articles/inp",
  },
  duplicate_title: {
    whatIsIt:
      "Two or more pages share the exact same <title>. Google may merge them in search results.",
    whyItMatters:
      "Duplicate titles trigger keyword cannibalization — two of your own pages compete for the same query, and Google picks the wrong one.",
    howToFix: [
      "Differentiate each page's title by intent (e.g. 'reviews' vs 'pricing' vs 'guide').",
      "Or canonicalize if they're truly the same content.",
    ],
    confidence: "definitely",
  },
  duplicate_meta_description: {
    whatIsIt:
      "Multiple pages share the same meta description.",
    whyItMatters:
      "Less harmful than duplicate titles but signals laziness to Google's quality system. Each page should describe itself.",
    howToFix: [
      "Write unique descriptions per page.",
      "Or remove them and let Google generate dynamically.",
    ],
    confidence: "probably",
  },
  noindex: {
    whatIsIt:
      "This page has a 'noindex' robots directive — Google has been told not to include it in search results.",
    whyItMatters:
      "If intentional (e.g. login, admin pages), this is fine. If accidental on a money page, it's catastrophic — that page earns zero organic traffic.",
    howToFix: [
      "Confirm this page SHOULD be hidden from search.",
      "If not, remove the <meta name=\"robots\" content=\"noindex\"> or X-Robots-Tag header.",
      "Then re-submit the URL in Google Search Console.",
    ],
    confidence: "definitely",
    externalTool: ({ url }) => ({
      label: "Open in Google Search Console",
      href: url
        ? `https://search.google.com/search-console/inspect?id=${encodeURIComponent(url)}`
        : "https://search.google.com/search-console",
    }),
  },
  blocked_by_robots: {
    whatIsIt:
      "Your robots.txt is blocking Googlebot from crawling this URL.",
    whyItMatters:
      "Blocked pages can still be indexed (URL-only, no snippet) but rank poorly. Disallow on important pages = no traffic.",
    howToFix: [
      "Check robots.txt at yoursite.com/robots.txt.",
      "Remove the Disallow line targeting this URL pattern.",
      "Re-submit sitemap in GSC.",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
  },
  thin_content: {
    whatIsIt:
      "This page has fewer than ~300 words of unique content.",
    whyItMatters:
      "Google's Helpful Content System penalizes pages that don't satisfy user intent. Thin pages on important keywords are a top deindexing cause.",
    howToFix: [
      "Add genuine depth — examples, data, FAQs, original analysis.",
      "Aim for 600-1500 words on commercial pages, 1500+ on informational.",
      "If you can't justify depth, consolidate with a fuller page via 301.",
    ],
    confidence: "probably",
  },
  no_internal_links: {
    whatIsIt:
      "No other page on the site links to this page.",
    whyItMatters:
      "Orphan pages are hard for Google to discover and pass zero PageRank from your site's authority pool.",
    howToFix: [
      "Add 3-5 contextual links to this page from related articles.",
      "Add it to the main navigation or footer if topical.",
      "Use our internal-linking opportunity finder.",
    ],
    confidence: "probably",
  },
  missing_hreflang: {
    whatIsIt:
      "This international site has language/region variants but no hreflang tags connecting them.",
    whyItMatters:
      "Without hreflang, Google may serve the wrong language version to users, causing bounce.",
    howToFix: [
      "Add <link rel=\"alternate\" hreflang=\"en\" href=\"...\"> for each variant.",
      "Include a self-referencing hreflang on every page.",
      "Add x-default for the language picker / global homepage.",
    ],
    confidence: "definitely",
    googleDoc:
      "https://developers.google.com/search/docs/specialty/international/localized-versions",
  },
  http_not_https: {
    whatIsIt:
      "This URL is served over HTTP, not HTTPS.",
    whyItMatters:
      "HTTPS has been a Google ranking signal since 2014. Chrome flags HTTP pages as 'Not Secure', killing trust + conversions.",
    howToFix: [
      "Get a free SSL cert from Let's Encrypt or use Cloudflare.",
      "301-redirect HTTP → HTTPS on every URL.",
      "Update internal links to HTTPS.",
    ],
    confidence: "definitely",
  },
};

/**
 * Look up explainer with graceful fallback for unknown types.
 */
export function getExplainer(type: string): IssueExplainer | null {
  return ISSUE_EXPLAINERS[type] ?? null;
}
