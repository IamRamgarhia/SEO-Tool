type Priority = "high" | "medium" | "low";
type Niche = "local" | "ecommerce" | "saas" | "blog" | "services";

export type NicheTaskTemplate = {
  title: string;
  description: string;
  whyItMatters: string;
  priority: Priority;
};

const local: NicheTaskTemplate[] = [
  {
    title: "Claim and verify your Google Business Profile",
    description:
      "Search your business name on Google. If the GBP card on the right shows 'Own this business?', click it and verify.",
    whyItMatters:
      "Google Business Profile is the single biggest local-SEO ranking factor. Until it's verified, you can't appear in the local 3-pack at all.",
    priority: "high",
  },
  {
    title: "Confirm NAP consistency across the web",
    description:
      "Make sure Name, Address, and Phone match exactly across your site, GBP, Yelp, Facebook, and major directories.",
    whyItMatters:
      "Google uses NAP consistency as a trust signal for local businesses. Even small mismatches (St. vs Street) can dilute local rankings.",
    priority: "high",
  },
  {
    title: "Set up a system to request Google reviews",
    description:
      "Generate a short review link from your GBP and add it to email signatures, receipts, and follow-up messages.",
    whyItMatters:
      "Review count and recency are direct ranking factors for the local pack. Aim for at least 1–2 new reviews per month.",
    priority: "high",
  },
  {
    title: "Add LocalBusiness schema to your homepage",
    description:
      "Add JSON-LD structured data with name, address, telephone, openingHours, and geo coordinates.",
    whyItMatters:
      "LocalBusiness schema helps Google understand you're a physical-location business and powers rich features in search.",
    priority: "medium",
  },
  {
    title: "Build dedicated landing pages for each service area",
    description:
      "If you serve multiple cities, create one page per city with unique content (not just a swap of city name).",
    whyItMatters:
      "Generic 'we serve all of California' pages don't rank for city-level searches. Dedicated city pages do.",
    priority: "medium",
  },
  {
    title: "Audit local citations for accuracy",
    description:
      "Check listings on Yelp, Facebook, BBB, Apple Maps, Bing Places, plus 5–10 niche directories for your industry.",
    whyItMatters:
      "Outdated citations confuse Google about your real address and phone — clean them up to consolidate signals.",
    priority: "medium",
  },
];

const ecommerce: NicheTaskTemplate[] = [
  {
    title: "Add Product schema to every product page",
    description:
      "Use JSON-LD with name, image, description, sku, brand, offers (price, availability), and aggregateRating.",
    whyItMatters:
      "Product schema unlocks rich results in Google: price, stock status, ratings — directly improving CTR and qualified clicks.",
    priority: "high",
  },
  {
    title: "Optimize product image file sizes and alt text",
    description:
      "Run a bulk image audit. Convert to WebP, target under 100KB each, and write descriptive alt text using product name + key attributes.",
    whyItMatters:
      "Images drive product-page LCP and unlock Google Images traffic, which converts well for ecommerce.",
    priority: "high",
  },
  {
    title: "Audit faceted navigation for indexable junk URLs",
    description:
      "Check filters and sort parameters. Anything that creates near-duplicate URLs (color=red&size=L vs size=L&color=red) needs canonicals or noindex.",
    whyItMatters:
      "Uncontrolled facets can generate millions of low-value pages, wasting crawl budget and creating duplicate-content problems.",
    priority: "high",
  },
  {
    title: "Write unique copy for category and collection pages",
    description:
      "Add a 100–300 word intro to each major category page above the product grid, covering buyer intent and key attributes.",
    whyItMatters:
      "Category pages often rank for the highest-volume commercial queries — but only if they have content beyond a product grid.",
    priority: "medium",
  },
  {
    title: "Set up clean breadcrumb navigation with schema",
    description:
      "Visible breadcrumbs (Home › Category › Subcategory › Product) plus BreadcrumbList JSON-LD.",
    whyItMatters:
      "Breadcrumbs improve internal linking, navigation depth, and unlock breadcrumb display in Google search results.",
    priority: "medium",
  },
  {
    title: "Plan how to handle out-of-stock products",
    description:
      "Decide: keep page live with 'out of stock' (good for SEO), redirect to category, or 410. Document the rule.",
    whyItMatters:
      "Killing pages too aggressively destroys earned rankings and backlinks. Keeping them live with proper schema is usually best.",
    priority: "low",
  },
];

const saas: NicheTaskTemplate[] = [
  {
    title: "Build comparison pages for each major competitor",
    description:
      "Create '[Your product] vs [Competitor]' pages — fair, detailed, with feature tables. Aim for 5–10 of these.",
    whyItMatters:
      "Comparison queries are bottom-of-funnel and high-intent. Owning these pages captures buyers actively evaluating you.",
    priority: "high",
  },
  {
    title: "Build integration pages for every tool you connect to",
    description:
      "One page per integration (e.g. '/integrations/slack') describing the use case, setup, and benefit.",
    whyItMatters:
      "Buyers search for 'X integration Y' before purchase. Integration pages capture that intent and double as sales collateral.",
    priority: "high",
  },
  {
    title: "Set up programmatic SEO for use-case landing pages",
    description:
      "Identify a templatable pattern (e.g. 'Time tracking for [industry]') and ship 20–100 variants powered from a single template + dataset.",
    whyItMatters:
      "Programmatic SEO is one of the highest-leverage tactics for SaaS — it scales coverage of long-tail use cases dramatically.",
    priority: "medium",
  },
  {
    title: "Write SoftwareApplication schema for your homepage",
    description:
      "Add JSON-LD with applicationCategory, offers (pricing tiers), aggregateRating from real reviews.",
    whyItMatters:
      "Helps Google place you in software-specific search features and review-rich snippets when applicable.",
    priority: "medium",
  },
  {
    title: "Build a deep, hub-and-spoke help center",
    description:
      "Central /docs hub linking to every feature article. Articles target informational queries from users — and rank.",
    whyItMatters:
      "Documentation is high-quality, naturally linked content. SaaS sites often rank for product-related questions through docs alone.",
    priority: "medium",
  },
  {
    title: "Add FAQ schema to pricing and feature pages",
    description:
      "Wrap real questions and answers in FAQPage JSON-LD on pages where users have purchase questions.",
    whyItMatters:
      "FAQ rich results take up extra real estate in search and improve CTR on commercial-intent pages.",
    priority: "low",
  },
];

const blog: NicheTaskTemplate[] = [
  {
    title: "Build a content calendar for the next 90 days",
    description:
      "Plan 1–2 posts per week mapped to topic clusters, with target keywords and pillar links.",
    whyItMatters:
      "Consistent publishing on a clear topic plan beats sporadic posts. Topic depth signals authority to Google.",
    priority: "high",
  },
  {
    title: "Identify your top 3 topic clusters and pillar pages",
    description:
      "Pick the 3 broadest topics you want to own. For each, plan a 3000+ word pillar page and 5–10 supporting articles.",
    whyItMatters:
      "Topical authority — covering a subject deeply — is one of Google's strongest content-quality signals after the helpful-content updates.",
    priority: "high",
  },
  {
    title: "Audit content decay — flag posts losing traffic",
    description:
      "Pull GSC data, identify posts that lost >30% of clicks YoY. For each, decide: refresh, merge, or retire.",
    whyItMatters:
      "Refreshing decaying content recovers traffic at a fraction of the cost of new posts. It's the highest-ROI content task.",
    priority: "high",
  },
  {
    title: "Add Article schema with author + datePublished + dateModified",
    description:
      "Especially for YMYL or expertise-heavy content — make author bylines, credentials, and update dates explicit.",
    whyItMatters:
      "E-E-A-T (Experience, Expertise, Authoritativeness, Trust) is now a major Google signal, especially after the helpful-content updates.",
    priority: "medium",
  },
  {
    title: "Improve internal linking on top-performing posts",
    description:
      "On each top-traffic article, add 5–10 contextual links to related pillar/cluster pages.",
    whyItMatters:
      "Internal links pass authority from your strongest pages to weaker ones, lifting cluster-wide rankings.",
    priority: "medium",
  },
  {
    title: "Set up author pages with E-E-A-T signals",
    description:
      "Real photo, bio with credentials, links to past work, social profiles, schema with sameAs links.",
    whyItMatters:
      "Strong author signals separate trustworthy content from AI-generated noise — increasingly important post-helpful-content updates.",
    priority: "low",
  },
];

const services: NicheTaskTemplate[] = [
  {
    title: "Build dedicated pages for each service you offer",
    description:
      "Don't bundle services on one page. One page per service, each ~800–1500 words, addressing the specific buyer's questions.",
    whyItMatters:
      "Buyers search for specific services, not bundles. Dedicated pages rank for those specific queries.",
    priority: "high",
  },
  {
    title: "Add Service schema to each service page",
    description:
      "Use Service or ProfessionalService JSON-LD with serviceType, areaServed, provider, and offers if you have pricing.",
    whyItMatters:
      "Schema helps Google place you in service-related searches and unlock rich features for service businesses.",
    priority: "medium",
  },
  {
    title: "Publish 3–5 detailed case studies",
    description:
      "Real client, real outcome with numbers (or anonymized if needed), the process you used, and lessons learned.",
    whyItMatters:
      "Case studies are the strongest trust signal on a services site — both for ranking E-E-A-T and converting buyers who land.",
    priority: "high",
  },
  {
    title: "Build prominent trust signals on every page",
    description:
      "Awards, certifications, client logos, real testimonials with names and photos, real team photos.",
    whyItMatters:
      "Service buyers are evaluating risk. Trust signals reduce perceived risk and improve both rankings (E-E-A-T) and conversion.",
    priority: "medium",
  },
  {
    title: "Create a clear About page with team and credentials",
    description:
      "Real names, photos, credentials, years of experience. Link to LinkedIn profiles via sameAs schema.",
    whyItMatters:
      "Anonymous service businesses underperform. Real people with credentials are a major trust + E-E-A-T win.",
    priority: "medium",
  },
  {
    title: "Set up a FAQ section addressing buyer objections",
    description:
      "Mine sales calls for the 10 most common questions. Answer them on a page with FAQPage schema.",
    whyItMatters:
      "Answering buyer objections directly improves conversion rate and unlocks FAQ rich results in search.",
    priority: "low",
  },
];

export const nicheTemplates: Record<Niche, NicheTaskTemplate[]> = {
  local,
  ecommerce,
  saas,
  blog,
  services,
};

export function getNicheTemplates(
  niche: string | null | undefined,
): NicheTaskTemplate[] {
  if (!niche) return [];
  return nicheTemplates[niche as Niche] ?? [];
}

/**
 * Universal task playbooks. Each playbook is a named bundle of tasks that
 * applies to any client regardless of niche or tech stack. These cover the
 * common day-to-day / weekly / monthly SEO routines that every site needs.
 *
 * Apply via the /tasks/templates page — clones every task into the chosen
 * client with optional staggered due dates.
 */
export type Playbook = {
  id: string;
  name: string;
  description: string;
  category: "weekly" | "monthly" | "quarterly" | "launch" | "recovery";
  /** Estimated total hours to complete the playbook. */
  estimatedHours: number;
  /** Tasks in suggested order. The first task gets dueDate today + offsetDays. */
  tasks: (NicheTaskTemplate & { offsetDays?: number })[];
};

export const playbooks: Playbook[] = [
  {
    id: "weekly-health-check",
    name: "Weekly health check",
    description:
      "What every SEO does first thing Monday — catch ranking drops, indexing issues, broken pages before clients notice.",
    category: "weekly",
    estimatedHours: 1,
    tasks: [
      {
        title: "Review GSC for sudden traffic drops",
        description:
          "Open Search Console → Performance. Compare last 7 days vs prior 7. Flag any query/page with >25% click drop and investigate.",
        whyItMatters:
          "Catching drops early lets you correlate against algorithm updates, your own deploys, or content changes — and recover before the loss compounds.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Check Coverage / Pages report for new errors",
        description:
          "GSC → Indexing → Pages. Look for any new errors (404, redirect issues, soft-404, server errors).",
        whyItMatters:
          "Indexing errors block pages from earning traffic. Most are easy fixes if caught the same week they appear.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Re-check rank tracker for tracked keywords",
        description:
          "Look at rank changes >5 positions on tracked keywords. Verify any drops aren't temporary SERP volatility.",
        whyItMatters:
          "Tracked keywords are the ones tied to revenue. Big drops here demand same-week investigation, not month-end discovery.",
        priority: "medium",
        offsetDays: 0,
      },
      {
        title: "Run a fresh site audit on key pages",
        description:
          "Audit the homepage + top 3 traffic pages. Confirm titles, metas, schema, and CWV haven't regressed.",
        whyItMatters:
          "Deploys and CMS edits silently break SEO. Weekly audits catch regressions before they hurt rankings.",
        priority: "medium",
        offsetDays: 1,
      },
    ],
  },
  {
    id: "monthly-content-refresh",
    name: "Monthly content refresh",
    description:
      "Find decaying pages, update them, and re-promote. The single highest-ROI ongoing SEO activity for content sites.",
    category: "monthly",
    estimatedHours: 6,
    tasks: [
      {
        title: "Identify top 5 decaying pages from GSC",
        description:
          "Use the Content decay tool. Pick pages with meaningful prior traffic and >20% click drop.",
        whyItMatters:
          "Refreshing existing top performers is 5–10× faster than ranking new content, and Google rewards freshness signals on previously trusted pages.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Audit each decaying page against current SERP",
        description:
          "Search the target keyword. Note what the top 3 results cover that yours doesn't. Check for outdated stats, year mentions, and screenshots.",
        whyItMatters:
          "SERPs evolve. The page that ranked 18 months ago may now miss key subtopics, schema, or freshness signals competitors have added.",
        priority: "high",
        offsetDays: 1,
      },
      {
        title: "Rewrite intro + add 1–2 new sections per page",
        description:
          "Update the intro with fresh framing, current year, and updated stats. Add new sections covering subtopics from your SERP audit.",
        whyItMatters:
          "Substantial content updates (not just changing a date) trigger Google's freshness re-evaluation and typically lift rankings within 2–4 weeks.",
        priority: "high",
        offsetDays: 3,
      },
      {
        title: "Update internal links pointing into refreshed pages",
        description:
          "Find pages already linking to the refreshed page. Update anchor text to match the new focus, add 2–3 fresh internal links from related posts.",
        whyItMatters:
          "Internal link signals reinforce the refresh — Google re-crawls linked pages faster, and updated anchor text helps with semantic relevance.",
        priority: "medium",
        offsetDays: 5,
      },
      {
        title: "Re-submit refreshed URLs in GSC",
        description:
          "GSC → URL Inspection → Request Indexing for each refreshed URL. Speeds up the re-crawl from days to hours.",
        whyItMatters:
          "Manual re-indexing accelerates Google's evaluation of your changes. The faster Google sees the new content, the faster you see ranking lift.",
        priority: "medium",
        offsetDays: 7,
      },
    ],
  },
  {
    id: "monthly-technical-audit",
    name: "Monthly technical audit",
    description:
      "The technical SEO health pass — broken links, redirects, schema, CWV, indexability. Catch debt before it accumulates.",
    category: "monthly",
    estimatedHours: 4,
    tasks: [
      {
        title: "Run a full broken-link scan",
        description:
          "Crawl the site. Fix any internal 404s, update outbound dead links, redirect orphaned pages.",
        whyItMatters:
          "Broken links waste crawl budget, frustrate users, and suggest poor maintenance to Google. They accumulate quietly with every CMS edit.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Audit redirect chains (>1 hop)",
        description:
          "Find any URL that redirects more than once before resolving. Replace each with a single direct redirect to the final URL.",
        whyItMatters:
          "Each redirect hop wastes crawl budget and adds latency. Long chains can cause Google to abandon the crawl entirely.",
        priority: "medium",
        offsetDays: 1,
      },
      {
        title: "Validate schema on key page types",
        description:
          "Test homepage, product/service template, blog template, and contact page through Google's Rich Results Test.",
        whyItMatters:
          "Schema breaks silently with theme/CMS updates. Broken schema means losing rich results — directly impacting SERP CTR.",
        priority: "medium",
        offsetDays: 2,
      },
      {
        title: "Review Core Web Vitals trend",
        description:
          "Open PageSpeed Insights for the homepage + 2 traffic pages. Confirm LCP < 2.5s, INP < 200ms, CLS < 0.1.",
        whyItMatters:
          "CWV is a confirmed ranking factor. Regressions usually come from new third-party scripts, image swaps, or theme updates.",
        priority: "medium",
        offsetDays: 3,
      },
      {
        title: "Check robots.txt + sitemap.xml health",
        description:
          "Validate both files. Confirm sitemap submits cleanly in GSC and contains only canonical URLs returning 200.",
        whyItMatters:
          "A broken sitemap or wrong robots.txt rule can deindex large parts of a site overnight. Worth a 5-minute check.",
        priority: "low",
        offsetDays: 4,
      },
    ],
  },
  {
    id: "monthly-competitor-watch",
    name: "Monthly competitor watch",
    description:
      "What your top 3 competitors did this month — content, backlinks, ranking gains. Steal what works.",
    category: "monthly",
    estimatedHours: 3,
    tasks: [
      {
        title: "List new content competitors published this month",
        description:
          "Check 3 competitors' /blog or sitemaps. Note new posts, target keywords, format, length.",
        whyItMatters:
          "Knowing what they're investing in tells you which keywords are heating up in your niche before they show in your rank tracker.",
        priority: "medium",
        offsetDays: 0,
      },
      {
        title: "Identify keywords competitors gained on this month",
        description:
          "Use SERP overlap tooling — find queries where they now rank top 10 and you don't.",
        whyItMatters:
          "Their wins are your roadmap. New rankings = a topic Google is currently rewarding in your niche.",
        priority: "medium",
        offsetDays: 1,
      },
      {
        title: "Check competitors for new high-quality backlinks",
        description:
          "Use GSC + Ahrefs Webmaster Tools (free). Note any new domain-rating-30+ links. Investigate the linking page — can you earn the same?",
        whyItMatters:
          "Reverse-engineering link sources is the highest-yield link-building research. Sites that link to one competitor often link to others.",
        priority: "low",
        offsetDays: 2,
      },
      {
        title: "Note any major page changes on competitor key pages",
        description:
          "Diff their homepage + top traffic pages from last month. Look for new sections, schema changes, repositioning.",
        whyItMatters:
          "Big competitor edits often correlate with their own ranking movements — a leading indicator for what's about to work in the niche.",
        priority: "low",
        offsetDays: 3,
      },
    ],
  },
  {
    id: "new-client-onboarding",
    name: "New client onboarding",
    description:
      "First 14 days with a new client — get GSC/GA4 connected, baseline measurements, quick wins, and trust built.",
    category: "launch",
    estimatedHours: 8,
    tasks: [
      {
        title: "Connect Google Search Console",
        description:
          "Verify the property if not already, then connect via OAuth. Confirm 16 months of historical data is visible.",
        whyItMatters:
          "GSC is your single source of truth for what's actually ranking. Without it, every recommendation is guesswork.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Connect Google Analytics 4",
        description:
          "Get GA4 access (Read & Analyze role). Verify organic traffic data appears and matches GSC clicks within ~10%.",
        whyItMatters:
          "GA4 ties traffic to outcomes (conversions, revenue). Without it, you can't show the client what their SEO investment actually returned.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Run baseline full-site audit",
        description:
          "Crawl every URL. Capture initial health score, issue counts by severity, top 10 issues. Save as the baseline snapshot.",
        whyItMatters:
          "The baseline is your before-photo. Every monthly report compares against it — without it you have no measurable progress to show.",
        priority: "high",
        offsetDays: 1,
      },
      {
        title: "Identify and fix top 3 quick-win issues",
        description:
          "From the audit, pick the 3 issues with highest impact-to-effort ratio. Fix them in week 1 to show immediate movement.",
        whyItMatters:
          "Visible progress in the first 2 weeks is what builds client trust. A single ranking improvement they can see makes them advocates internally.",
        priority: "high",
        offsetDays: 2,
      },
      {
        title: "Build initial keyword tracking list (20–50 keywords)",
        description:
          "Start with their existing top GSC queries + 5–10 strategic targets they want to rank for. Don't track aspirational long-tail yet.",
        whyItMatters:
          "Tracking the wrong keywords (or too many) creates noise. Start narrow with what's already working + immediate goals.",
        priority: "medium",
        offsetDays: 4,
      },
      {
        title: "Document goals + first 90-day strategy",
        description:
          "Write a one-page strategy doc: client's 3 goals, your 3 priorities, first 30/60/90-day milestones. Share for sign-off.",
        whyItMatters:
          "Aligning on goals up front prevents 'why did you do X' conversations later. The signed-off plan is your shield + roadmap.",
        priority: "medium",
        offsetDays: 7,
      },
    ],
  },
  {
    id: "traffic-drop-recovery",
    name: "Traffic drop recovery",
    description:
      "Run when GSC shows a sudden drop. Diagnose the cause systematically before guessing — most drops have one of five causes.",
    category: "recovery",
    estimatedHours: 4,
    tasks: [
      {
        title: "Confirm the drop is real (not a tracking issue)",
        description:
          "Check GSC + GA4 + your rank tracker independently. Confirm the drop appears in all three.",
        whyItMatters:
          "Tracking glitches account for ~15% of perceived 'drops'. Eliminate this first before spending hours diagnosing a non-issue.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Check if a Google algorithm update overlaps the drop date",
        description:
          "Look at Google's Search Status Dashboard + algorithm-update tracker. Note if any update finished within ±3 days of the drop.",
        whyItMatters:
          "Algorithm updates are the #1 cause of unexplained drops. Knowing 'core update' vs 'spam update' vs 'helpful content' shapes the entire recovery strategy.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Identify which pages and queries dropped most",
        description:
          "GSC → Performance → compare 28 days before vs 28 days after. Sort by clicks lost. Focus on the top 10.",
        whyItMatters:
          "Drops are rarely site-wide. Finding the concentrated pages tells you whether it's content, technical, or SERP-feature related.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Audit the dropped pages for technical regressions",
        description:
          "Run a fresh audit on each. Check for new noindex, redirect issues, schema breaks, CWV regressions, recent CMS edits.",
        whyItMatters:
          "Technical regressions account for ~20% of drops and are the easiest to fix. Rule them out before assuming a content issue.",
        priority: "medium",
        offsetDays: 1,
      },
      {
        title: "Compare dropped pages to current top 3 in SERP",
        description:
          "Search each lost query. Compare your page's content depth, intent match, and freshness against the new top 3.",
        whyItMatters:
          "Most algorithm-driven drops are 'your page is no longer the best answer'. A side-by-side reveals exactly what's missing.",
        priority: "medium",
        offsetDays: 2,
      },
      {
        title: "Build the recovery plan + assign to content workflow",
        description:
          "Based on findings, write 3–7 specific changes per page. Add each as tasks. Set a 30-day re-evaluation reminder.",
        whyItMatters:
          "Recovery requires patience — Google takes 4–8 weeks to re-evaluate. Locking changes into tasks (not your head) keeps execution disciplined.",
        priority: "high",
        offsetDays: 3,
      },
    ],
  },
  {
    id: "quarterly-strategy-review",
    name: "Quarterly strategy review",
    description:
      "Step back from the daily grind every 90 days. Review what worked, kill what didn't, plan the next quarter.",
    category: "quarterly",
    estimatedHours: 4,
    tasks: [
      {
        title: "Review the past quarter's wins and losses",
        description:
          "Pull traffic, ranking, and conversion data over 90 days. Identify the 3 biggest wins and 3 biggest losses.",
        whyItMatters:
          "Patterns only emerge at quarterly scale. Weekly noise hides what's actually compounding over months.",
        priority: "high",
        offsetDays: 0,
      },
      {
        title: "Audit your tracked keywords — drop the dead ones",
        description:
          "Remove keywords with zero impressions for 90+ days. Add new strategic targets that emerged from competitor / GSC research.",
        whyItMatters:
          "Stale keyword lists waste tracking budget and dilute focus. Quarterly pruning keeps the dashboard a real signal.",
        priority: "medium",
        offsetDays: 1,
      },
      {
        title: "Review topical authority — which clusters compound, which don't",
        description:
          "Map topic clusters to actual traffic. Identify clusters earning compound traffic vs. dead-end ones.",
        whyItMatters:
          "Doubling down on what's working beats spreading thin. Quarterly cluster reviews redirect content investment to proven topics.",
        priority: "medium",
        offsetDays: 2,
      },
      {
        title: "Set next quarter's 3 priorities + measurable OKRs",
        description:
          "Pick exactly 3 priorities. For each, write a measurable target (clicks, rankings, conversions). Share with stakeholders.",
        whyItMatters:
          "Three priorities focus execution. Five priorities = no priorities. Measurable OKRs make the next quarterly review meaningful instead of vibes-based.",
        priority: "high",
        offsetDays: 3,
      },
    ],
  },
];

export function getPlaybook(id: string): Playbook | undefined {
  return playbooks.find((p) => p.id === id);
}
