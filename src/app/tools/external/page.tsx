import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import Link from "next/link";

type Tool = {
  name: string;
  url: string;
  description: string;
  pricing: "free" | "free-tier" | "paid";
  category: string;
};

const tools: Tool[] = [
  // Domain authority / authority metrics
  {
    name: "Moz Free Domain Analysis",
    url: "https://moz.com/domain-analysis",
    description:
      "DA, page authority, spam score, top linking domains. Free, signup required.",
    pricing: "free",
    category: "Authority metrics",
  },
  {
    name: "Ahrefs Free Backlink Checker",
    url: "https://ahrefs.com/backlink-checker",
    description: "Top 100 backlinks for any domain, DR, and anchor text. Free.",
    pricing: "free",
    category: "Authority metrics",
  },
  {
    name: "Ubersuggest",
    url: "https://neilpatel.com/ubersuggest/",
    description:
      "Domain overview, traffic estimates, top keywords. Free 3 searches/day.",
    pricing: "free-tier",
    category: "Authority metrics",
  },
  {
    name: "Semrush Domain Overview",
    url: "https://www.semrush.com/analytics/overview/",
    description:
      "Authority score, organic traffic estimate, top keywords. Free with signup, ~10/day.",
    pricing: "free-tier",
    category: "Authority metrics",
  },

  // Keyword research
  {
    name: "Google Keyword Planner",
    url: "https://ads.google.com/aw/keywordplanner",
    description: "Real Google search volumes. Free with any Google Ads account.",
    pricing: "free",
    category: "Keyword research",
  },
  {
    name: "Google Trends",
    url: "https://trends.google.com/",
    description: "Search interest over time, regional popularity, related queries.",
    pricing: "free",
    category: "Keyword research",
  },
  {
    name: "AnswerThePublic",
    url: "https://answerthepublic.com/",
    description: "Question-based keyword discovery from autocomplete data.",
    pricing: "free-tier",
    category: "Keyword research",
  },
  {
    name: "AlsoAsked",
    url: "https://alsoasked.com/",
    description: "People-Also-Ask cluster mapping. Free 3/day.",
    pricing: "free-tier",
    category: "Keyword research",
  },
  {
    name: "Keyworddit",
    url: "https://keyworddit.com/",
    description: "Keywords mined from Reddit by subreddit. Free.",
    pricing: "free",
    category: "Keyword research",
  },

  // Technical / on-page checks
  {
    name: "Google PageSpeed Insights",
    url: "https://pagespeed.web.dev/",
    description: "Real-world Core Web Vitals + Lighthouse audit. Free, no signup.",
    pricing: "free",
    category: "Technical / Performance",
  },
  {
    name: "Google Mobile-Friendly Test",
    url: "https://search.google.com/test/mobile-friendly",
    description: "Google's official mobile usability check. Free.",
    pricing: "free",
    category: "Technical / Performance",
  },
  {
    name: "Google Rich Results Test",
    url: "https://search.google.com/test/rich-results",
    description:
      "Validates structured data + previews rich result eligibility. Free.",
    pricing: "free",
    category: "Technical / Performance",
  },
  {
    name: "Schema.org Validator",
    url: "https://validator.schema.org/",
    description: "Strictly validates JSON-LD against the schema.org spec. Free.",
    pricing: "free",
    category: "Technical / Performance",
  },
  {
    name: "GTmetrix",
    url: "https://gtmetrix.com/",
    description:
      "Page speed + waterfall + opportunities. Free 3 tests/day, no signup.",
    pricing: "free-tier",
    category: "Technical / Performance",
  },
  {
    name: "WebPageTest",
    url: "https://www.webpagetest.org/",
    description: "Detailed performance testing from multiple locations. Free.",
    pricing: "free",
    category: "Technical / Performance",
  },

  // Security
  {
    name: "Mozilla Observatory",
    url: "https://observatory.mozilla.org/",
    description:
      "Security headers grade A+ to F. Comprehensive checklist. Free.",
    pricing: "free",
    category: "Security",
  },
  {
    name: "Qualys SSL Labs",
    url: "https://www.ssllabs.com/ssltest/",
    description: "TLS / SSL certificate grade and detailed analysis. Free.",
    pricing: "free",
    category: "Security",
  },
  {
    name: "SecurityHeaders.com",
    url: "https://securityheaders.com/",
    description:
      "Quick HTTP-header grade by Scott Helme. Faster than Observatory. Free.",
    pricing: "free",
    category: "Security",
  },

  // Crawl + index
  {
    name: "Google Search Console",
    url: "https://search.google.com/search-console",
    description:
      "Indexing, performance, manual actions, sitemaps — Google's own data. Free.",
    pricing: "free",
    category: "Crawl + index",
  },
  {
    name: "Bing Webmaster Tools",
    url: "https://www.bing.com/webmasters",
    description:
      "Bing's GSC equivalent. Includes a free SEO audit. Underused.",
    pricing: "free",
    category: "Crawl + index",
  },
  {
    name: "URL Inspection (GSC)",
    url: "https://search.google.com/search-console/inspect",
    description:
      "Live test indexability of a single URL — replaces old Fetch as Google. Free.",
    pricing: "free",
    category: "Crawl + index",
  },
  {
    name: "IndexNow",
    url: "https://www.indexnow.org/",
    description:
      "Push URL changes to Bing/Yandex/Naver instantly. Free, key-based.",
    pricing: "free",
    category: "Crawl + index",
  },

  // Backlink discovery
  {
    name: "Ahrefs Webmaster Tools",
    url: "https://ahrefs.com/webmaster-tools",
    description:
      "Free Ahrefs for verified domain owners — includes backlink data + audits.",
    pricing: "free",
    category: "Backlinks",
  },
  {
    name: "OpenLinkProfiler",
    url: "https://www.openlinkprofiler.org/",
    description: "Free backlink checker with daily refresh. No signup.",
    pricing: "free",
    category: "Backlinks",
  },
  {
    name: "Common Crawl",
    url: "https://commoncrawl.org/",
    description:
      "Massive open-source web crawl dataset. Power-user backlink mining.",
    pricing: "free",
    category: "Backlinks",
  },

  // History / archive
  {
    name: "Wayback Machine",
    url: "https://web.archive.org/",
    description: "How a domain looked + when it was first indexed. Free.",
    pricing: "free",
    category: "History",
  },
  {
    name: "ICANN Whois Lookup",
    url: "https://lookup.icann.org/",
    description: "Domain registration date, registrar, owner if not private.",
    pricing: "free",
    category: "History",
  },

  // AI search visibility
  {
    name: "ChatGPT (search mode)",
    url: "https://chatgpt.com/",
    description:
      "Test how your site is cited in ChatGPT's web answers. Manual but real.",
    pricing: "free-tier",
    category: "AI visibility",
  },
  {
    name: "Perplexity",
    url: "https://www.perplexity.ai/",
    description: "Citation-first AI search. Test which queries cite your site.",
    pricing: "free-tier",
    category: "AI visibility",
  },
  {
    name: "Google AI Overviews",
    url: "https://www.google.com/",
    description: "Search your tracked queries — note when AIO appears + sources.",
    pricing: "free",
    category: "AI visibility",
  },
];

const categories = Array.from(new Set(tools.map((t) => t.category)));

const pricingTone: Record<Tool["pricing"], string> = {
  free: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "free-tier": "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  paid: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
};

export default function ExternalToolsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        All tools
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/30">
            <Globe className="size-5 text-cyan-300" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-gradient-brand">External SEO toolkit</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Curated free / free-tier external tools for what we can&apos;t check
          ourselves — Domain Authority, full backlink indexes, traffic
          estimates, and SSL/security grades. All bookmarks below are tools
          working SEOs reach for daily.
        </p>
      </header>

      {categories.map((cat) => {
        const items = tools.filter((t) => t.category === cat);
        return (
          <section
            key={cat}
            className="glass-apple relative overflow-hidden rounded-2xl"
          >
            <header className="border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="text-base font-semibold">{cat}</h2>
              <p className="text-[11px] text-muted-foreground">
                {items.length} tool{items.length === 1 ? "" : "s"}
              </p>
            </header>
            <ul className="divide-y divide-white/[0.04]">
              {items.map((t) => (
                <li key={t.name} className="px-5 py-3 text-sm">
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-3 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium group-hover:underline">
                          {t.name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${pricingTone[t.pricing]}`}
                        >
                          {t.pricing.replace("-", " ")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </div>
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
