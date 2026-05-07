/**
 * Platform-specific citation tactics for ChatGPT, Perplexity, Claude, Gemini,
 * and Google AI Overviews.
 *
 * Research basis (2026 LLM citation benchmark studies):
 *   - ChatGPT: leans on traditional authority. Heavy citations from major
 *     publications, Wikipedia, Reddit (less than Perplexity), human-curated
 *     listicles. Very domain-stable.
 *   - Perplexity: 46.7% of top citations from Reddit, ~14% from YouTube.
 *     Heavy weight on community / experience-driven sources.
 *   - Claude: smaller citation universe, but heavy weight on official
 *     documentation, Wikipedia, GitHub repos, and primary sources.
 *   - Gemini / AI Mode: deeply integrated with Google Search, so traditional
 *     SEO + structured data + E-E-A-T are still the dominant levers, plus
 *     entity verification via schema.
 *   - AI Overviews: 134-167 word self-contained passages with explicit
 *     definitions perform best.
 *
 * Only ~11% of cited domains overlap between ChatGPT and Perplexity, so a
 * single "be helpful" strategy is incomplete — each platform rewards
 * different work.
 */

export type Tactic = {
  id: string;
  title: string;
  detail: string;
  effort: "low" | "medium" | "high";
};

export type PlatformTactics = {
  platform: "ChatGPT" | "Perplexity" | "Claude" | "Gemini / AI Mode" | "Google AI Overviews";
  audienceShare: string;
  citationBias: string;
  tactics: Tactic[];
};

export const PLATFORM_TACTICS: PlatformTactics[] = [
  {
    platform: "ChatGPT",
    audienceShare: "Largest LLM by user count. Citations bias toward Wikipedia, major media, Reddit threads, evergreen listicles.",
    citationBias: "Authoritative + canonical sources. Domain-stable: same 30-50 domains cited repeatedly across topics.",
    tactics: [
      {
        id: "wiki",
        title: "Get a Wikipedia mention",
        detail:
          "ChatGPT cites Wikipedia disproportionately. Earn a notable-mention link from a Wikipedia article in your space (real edits, real sources — no PR spam).",
        effort: "high",
      },
      {
        id: "major-media",
        title: "Earn one major-publication mention per quarter",
        detail:
          "Forbes, TechCrunch, BBC, NYT, etc. — even a single quote in a relevant article moves you into ChatGPT's citation graph for months.",
        effort: "high",
      },
      {
        id: "listicle",
        title: "Get included in evergreen 'best of' listicles",
        detail:
          'Search for "best [your category] 2026" listicles ranking on page 1. Email the authors with a clear one-paragraph pitch + your unique differentiator. Listicle inclusion is one of ChatGPT\'s strongest signals.',
        effort: "medium",
      },
      {
        id: "company-page",
        title: "Maintain a clean company-summary page",
        detail:
          "ChatGPT pulls a 2-3 sentence summary of who you are. Make sure your /about page, Crunchbase profile, and LinkedIn match — they're the sources it samples.",
        effort: "low",
      },
      {
        id: "reddit-mid",
        title: "Mid-priority: Reddit",
        detail:
          "ChatGPT cites Reddit but less heavily than Perplexity. A handful of helpful, high-upvote Reddit posts referencing your tool is enough.",
        effort: "medium",
      },
    ],
  },
  {
    platform: "Perplexity",
    audienceShare: "Fastest-growing LLM for queries that resemble Google searches. Citations bias toward community + experience.",
    citationBias: "46.7% of top citations from Reddit. ~14% from YouTube. Heavy on r/[your-niche] threads and YouTube tutorials.",
    tactics: [
      {
        id: "reddit-heavy",
        title: "Reddit is your single highest-leverage tactic",
        detail:
          "Build a multi-month presence in 2-3 niche subreddits. Genuinely helpful comments + occasional product mentions where relevant. Don't karma-farm — Perplexity weights upvote/downvote ratio heavily.",
        effort: "high",
      },
      {
        id: "youtube",
        title: "Publish or sponsor YouTube content",
        detail:
          "Perplexity pulls timestamps + transcripts from YouTube videos. A single well-ranked tutorial can drive citations for months. Caption files matter — auto-generated captions are weighted lower.",
        effort: "high",
      },
      {
        id: "ama",
        title: "Run an AMA in a relevant subreddit",
        detail:
          "AMAs land in Perplexity's citation graph because they generate dense, on-topic comment threads with high engagement.",
        effort: "medium",
      },
      {
        id: "comparison-content",
        title: "Write 'X vs Y' comparison pages",
        detail:
          "Perplexity loves comparison pages with clear tables. Write honest comparisons including competitors — even ones you lose. Earns trust.",
        effort: "medium",
      },
    ],
  },
  {
    platform: "Claude",
    audienceShare: "Smaller user base but high-influence audience (developers, researchers, knowledge workers).",
    citationBias: "Official documentation, Wikipedia, GitHub repos, primary sources. Less Reddit. Strong preference for first-hand authoritative sources.",
    tactics: [
      {
        id: "docs",
        title: "Maintain pristine official documentation",
        detail:
          "Claude cites your /docs heavily if it's clean, well-structured, and uses semantic HTML. Self-contained doc pages with clear H2/H3 win citations.",
        effort: "medium",
      },
      {
        id: "github",
        title: "Open-source something useful",
        detail:
          "Even a small open-source repo (a CLI, a library, a starter template) puts you in Claude's citation pool because GitHub is heavily indexed.",
        effort: "high",
      },
      {
        id: "primary-data",
        title: "Publish original research / data",
        detail:
          "Surveys, benchmarks, original studies. Claude prefers cite-able primary sources over secondary commentary. Publishing one well-sourced study a year compounds.",
        effort: "high",
      },
      {
        id: "wikipedia-claude",
        title: "Wikipedia",
        detail:
          "Same play as ChatGPT — earn a Wikipedia mention. Claude weights Wikipedia very heavily.",
        effort: "high",
      },
    ],
  },
  {
    platform: "Gemini / AI Mode",
    audienceShare: "Integrated directly into Google Search. Largest reach for traditional-search queries.",
    citationBias: "Whatever ranks in Google. Heavy weight on schema markup for entity verification, E-E-A-T signals, freshness.",
    tactics: [
      {
        id: "ranking",
        title: "Rank in classic Google first",
        detail:
          "Gemini / AI Mode pulls overwhelmingly from Google's top 10. Traditional SEO is the foundation: target keywords, internal linking, technical hygiene, fresh content.",
        effort: "high",
      },
      {
        id: "schema",
        title: "Implement Article + Person schema together",
        detail:
          "Gemini uses schema for entity verification. Article schema + a fully-fleshed Person object for the author (with sameAs links) is now critical.",
        effort: "low",
      },
      {
        id: "freshness",
        title: "Visible last-updated dates",
        detail:
          "Gemini favors content with recent dateModified — both in schema and visible on the page. Re-audit older content quarterly.",
        effort: "low",
      },
      {
        id: "structured-answers",
        title: "Use structured answer formats",
        detail:
          "Tables, definition lists, numbered steps. AI Mode pulls these directly into answers.",
        effort: "low",
      },
    ],
  },
  {
    platform: "Google AI Overviews",
    audienceShare: "Triggers on ~48% of queries. Cuts CTR by ~61% on affected queries — but earns 35% more clicks when you ARE cited.",
    citationBias: "134-167 word self-contained passages that fully answer the query. Schema for entity verification.",
    tactics: [
      {
        id: "passages",
        title: "Build cite-ready 134-167 word passages",
        detail:
          "Each H2 section should have at least one self-contained 134-167 word answer. Use the AI Overview passage optimizer in this tool to score and rewrite.",
        effort: "medium",
      },
      {
        id: "definitions",
        title: "Open every section with a direct definition",
        detail:
          'Lead with "X is …" or "X measures …" — AIs cite these openings disproportionately.',
        effort: "low",
      },
      {
        id: "concrete",
        title: "Include real numbers + proper nouns",
        detail:
          "1 specific number or proper noun per ~250 words. Hypotheticals get filtered out.",
        effort: "low",
      },
      {
        id: "person-schema",
        title: "Person schema for the author",
        detail:
          "AIO uses author entity verification. Use the Person schema generator in this tool, embed inside your Article schema.",
        effort: "low",
      },
    ],
  },
];

/** Filter tactics by niche-relevance — currently all are universal but
 * we annotate which platforms each niche should prioritize. */
export function priorityForNiche(
  niche: string | null,
): { platform: PlatformTactics["platform"]; reason: string }[] {
  if (niche === "saas") {
    return [
      {
        platform: "Claude",
        reason:
          "Claude's audience skews to developers/PMs evaluating tools. High intent, low CAC.",
      },
      {
        platform: "Perplexity",
        reason:
          "Comparison queries ('X vs Y') heavily Perplexity-driven for SaaS.",
      },
      {
        platform: "ChatGPT",
        reason: "Mass-reach for awareness; Wikipedia + listicle plays compound.",
      },
    ];
  }
  if (niche === "local") {
    return [
      {
        platform: "Gemini / AI Mode",
        reason:
          "Local intent queries route through Google AI Mode and surface LocalBusiness schema directly.",
      },
      {
        platform: "Google AI Overviews",
        reason: "Local AIO answers cite GBP + local citations heavily.",
      },
    ];
  }
  if (niche === "ecommerce") {
    return [
      {
        platform: "Google AI Overviews",
        reason:
          "Shopping-intent AIO answers pull from Product schema + reviews.",
      },
      {
        platform: "Perplexity",
        reason:
          "Buyer comparison queries heavily Perplexity-driven; YouTube reviews carry weight.",
      },
      {
        platform: "ChatGPT",
        reason: "Mass-reach for product awareness.",
      },
    ];
  }
  if (niche === "blog") {
    return [
      {
        platform: "Google AI Overviews",
        reason:
          "Information-intent queries are 80%+ of blog traffic; AIO citation = traffic.",
      },
      {
        platform: "ChatGPT",
        reason: "Listicle inclusion + Wikipedia mentions for evergreen topics.",
      },
    ];
  }
  if (niche === "services") {
    return [
      {
        platform: "Google AI Overviews",
        reason:
          'Service queries ("how do I…", "best [service] near me") increasingly hit AIO.',
      },
      {
        platform: "Gemini / AI Mode",
        reason: "Local + service entity recognition matters here.",
      },
    ];
  }
  return [
    { platform: "Google AI Overviews", reason: "Highest-volume citation surface across all niches." },
    { platform: "ChatGPT", reason: "Largest LLM user base." },
    { platform: "Perplexity", reason: "Fastest-growing for search-style queries." },
  ];
}
