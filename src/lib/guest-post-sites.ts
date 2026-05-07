/**
 * Curated guest-post platforms with submission style profiles.
 *
 * Two cohorts:
 *
 *   1) Open-publish platforms (Tier 4 in our docs) — Medium, Dev.to, Hashnode,
 *      Substack, LinkedIn Pulse, etc. Auto-publish / no editorial review for
 *      most users. Useful for foundation links and audience building. Backlinks
 *      are nofollow on most of these (we mark `dofollowPolicy`), so the value
 *      is brand reach + secondary citations rather than direct ranking lift.
 *
 *   2) Editorial publications (Tier 1-3) — Search Engine Journal, Smashing
 *      Magazine, A List Apart, MarketingProfs, HackerNoon, IndieHackers, etc.
 *      Pitch + editorial review. Higher ranking value when published, harder
 *      to land. Style guidelines are stricter — we capture them here so the
 *      AI writer can match house tone instead of reading like generic AI.
 *
 * Each site has a `style` object the writer uses verbatim. When you add a new
 * site, look at 3-5 of its top recent posts and mirror length, tone, voice,
 * "must do" patterns (case studies / data / personal anecdote), and "must
 * avoid" patterns (jargon, fluff, click-bait headlines).
 */

import type { Difficulty } from "./backlink-difficulty";

export type GuestPostSite = {
  /** Slug used in URLs and IDs. */
  id: string;
  /** Display name. */
  name: string;
  /** Domain (no protocol). */
  domain: string;
  /** Submission / write-for-us page. */
  submitUrl: string;
  /** Estimated DA — for sorting only, not authoritative. */
  estDA: number;
  /** Difficulty bucket. */
  difficulty: Difficulty;
  /** Niches/topics this platform welcomes. Used to filter for client fit. */
  niches: string[];
  /** Whether outbound links are dofollow. Matters for ranking value. */
  dofollowPolicy: "dofollow" | "nofollow" | "mixed";
  /** Style profile injected verbatim into the writer's system prompt. */
  style: {
    /** Target word count band. */
    wordCount: { min: number; ideal: number; max: number };
    /** Tone descriptor (e.g. "personal narrative", "data-driven case study"). */
    tone: string;
    /** Voice descriptor (e.g. "first person, conversational", "third-person editorial"). */
    voice: string;
    /** Must-include patterns. */
    mustDo: string[];
    /** Must-avoid patterns. */
    mustAvoid: string[];
    /** Heading style ("H2 sentence-case", "H1 only", etc). */
    headings: string;
    /** Notes on linking — natural in-content vs author bio vs allowed-once. */
    linking: string;
  };
};

export const GUEST_POST_SITES: GuestPostSite[] = [
  {
    id: "medium",
    name: "Medium",
    domain: "medium.com",
    submitUrl: "https://medium.com/new-story",
    estDA: 95,
    difficulty: "easy",
    niches: ["blog", "saas", "services", "personal-development", "tech", "startup"],
    dofollowPolicy: "nofollow",
    style: {
      wordCount: { min: 700, ideal: 1100, max: 1800 },
      tone: "personal narrative with a single insight",
      voice: "first person, conversational, contractions OK",
      mustDo: [
        "Open with a concrete moment or scene, not a definition",
        "Tell a real story — even one specific anecdote",
        "End with a single takeaway, not a 5-step recap",
        "Pull-quote one provocative sentence in italic",
      ],
      mustAvoid: [
        "Listicle scaffolding ('In this post we'll cover…')",
        "Listicle headlines like '10 ways to…'",
        "Heavy SEO keyword stuffing — Medium readers bail instantly",
        "Em-dashes overused — they read AI",
      ],
      headings: "H2 sentence-case, mostly skipped — flow > sectioning",
      linking: "1-2 inline citations max. No CTA. Bio-link only.",
    },
  },
  {
    id: "devto",
    name: "DEV Community",
    domain: "dev.to",
    submitUrl: "https://dev.to/new",
    estDA: 90,
    difficulty: "easy",
    niches: ["saas", "blog", "tech", "developer", "engineering"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 600, ideal: 1000, max: 1600 },
      tone: "tutorial / build-log, technical but warm",
      voice: "first person, casual, code-first",
      mustDo: [
        "Lead with the problem and the working solution",
        "Include working code blocks with language hints",
        "Show terminal output / screenshots where it adds clarity",
        "End with a single CTA to a repo / sandbox / gist",
      ],
      mustAvoid: [
        "Over-explaining basic concepts",
        "Marketing language",
        "Claiming benchmarks without data",
      ],
      headings: "H2 sentence-case, every 200-300 words",
      linking: "Inline links to docs / repos welcome. Author bio link is dofollow.",
    },
  },
  {
    id: "hashnode",
    name: "Hashnode",
    domain: "hashnode.com",
    submitUrl: "https://hashnode.com/create/story",
    estDA: 85,
    difficulty: "easy",
    niches: ["saas", "blog", "tech", "developer", "web3"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 600, ideal: 1100, max: 2000 },
      tone: "tutorial, explainer, opinionated build-log",
      voice: "first person, technical, pragmatic",
      mustDo: [
        "Cover-image prompt at the top",
        "TL;DR in 2-3 lines",
        "Working code samples + explanation",
        "Personal opinion in the closing section",
      ],
      mustAvoid: ["Generic 'top 10' content", "Plagiarism — Hashnode actively flags it"],
      headings: "H2 + H3 sentence-case",
      linking: "Inline + canonical reference welcome. Bio dofollow.",
    },
  },
  {
    id: "substack",
    name: "Substack",
    domain: "substack.com",
    submitUrl: "https://substack.com/sign-up",
    estDA: 92,
    difficulty: "easy",
    niches: ["blog", "newsletter", "services", "creator", "media"],
    dofollowPolicy: "nofollow",
    style: {
      wordCount: { min: 800, ideal: 1400, max: 2400 },
      tone: "essay, opinionated, reflective",
      voice: "first person, longform, literary cadence",
      mustDo: [
        "A single argument the whole piece earns",
        "At least one cited statistic or original data point",
        "Subheads as part of the narrative, not a TOC",
        "Closing line that earns a reply",
      ],
      mustAvoid: [
        "SEO list structures",
        "Empty CTAs",
        "Marketing voice — readers can smell it",
      ],
      headings: "H3 sparingly, never H2 stacks",
      linking: "Cite sources inline; author footer can include site link.",
    },
  },
  {
    id: "linkedin-pulse",
    name: "LinkedIn Pulse",
    domain: "linkedin.com",
    submitUrl: "https://www.linkedin.com/post/new/",
    estDA: 99,
    difficulty: "easy",
    niches: ["saas", "services", "b2b", "leadership", "career"],
    dofollowPolicy: "nofollow",
    style: {
      wordCount: { min: 500, ideal: 900, max: 1400 },
      tone: "professional but human, story-led",
      voice: "first person, executive-readable",
      mustDo: [
        "First sentence is a hook (LinkedIn cuts long previews)",
        "One real example — a client, a project, a mistake",
        "Use line breaks freely — wall-of-text dies on LinkedIn",
        "End with a soft question to invite comments",
      ],
      mustAvoid: [
        "Hashtag stuffing",
        "Sales pitches",
        "Generic motivational fluff",
      ],
      headings: "Bold first lines instead of H2s",
      linking: "1 link max in the post, link in the comments works better.",
    },
  },
  {
    id: "hackernoon",
    name: "HackerNoon",
    domain: "hackernoon.com",
    submitUrl: "https://app.hackernoon.com/new",
    estDA: 87,
    difficulty: "medium",
    niches: ["saas", "tech", "startup", "blockchain", "ai"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 800, ideal: 1300, max: 2500 },
      tone: "opinion / explainer with technical depth",
      voice: "first or third person, no fluff, citations expected",
      mustDo: [
        "Original perspective or contrarian take",
        "At least one chart, code block, or data point",
        "Cite sources with inline links",
      ],
      mustAvoid: ["AI-generated patterns (uniform paragraph length, vague intros)"],
      headings: "H2 + H3 with informative phrases (not questions)",
      linking: "Inline dofollow OK. Bio link dofollow.",
    },
  },
  {
    id: "indiehackers",
    name: "Indie Hackers",
    domain: "indiehackers.com",
    submitUrl: "https://www.indiehackers.com/post",
    estDA: 84,
    difficulty: "medium",
    niches: ["saas", "startup", "indie", "creator", "services"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 600, ideal: 1100, max: 1800 },
      tone: "transparent build-log / lessons-learned",
      voice: "first person, ruthlessly specific",
      mustDo: [
        "Real numbers ($MRR, churn %, time spent, exact tools)",
        "What you tried, what failed, what worked",
        "A specific takeaway someone can copy",
      ],
      mustAvoid: ["Vague advice", "Self-help language", "Promo posts disguised as stories"],
      headings: "H2 sentence-case, prose-heavy",
      linking: "1-2 inline links to your project. Dofollow. No spam.",
    },
  },
  {
    id: "search-engine-journal",
    name: "Search Engine Journal",
    domain: "searchenginejournal.com",
    submitUrl: "https://www.searchenginejournal.com/contribute/",
    estDA: 90,
    difficulty: "hard",
    niches: ["seo", "ppc", "content", "agency", "services"],
    dofollowPolicy: "mixed",
    style: {
      wordCount: { min: 1500, ideal: 2200, max: 3500 },
      tone: "data-driven, expert, actionable",
      voice: "third person editorial, professional",
      mustDo: [
        "Cite at least 3 primary sources (Google docs, GSC blog, study)",
        "Include original data — your own analysis or a live example",
        "Step-by-step actionable advice with screenshots",
        "Author byline links to LinkedIn + Twitter",
      ],
      mustAvoid: [
        "Affiliate / promotional content",
        "Recycled advice without a fresh angle",
        "AI-tropes ('In today's digital landscape…')",
      ],
      headings: "H2/H3 informative phrases, no clickbait",
      linking: "1 brand link in author bio, contextual links inline if cited",
    },
  },
  {
    id: "marketing-profs",
    name: "MarketingProfs",
    domain: "marketingprofs.com",
    submitUrl: "https://www.marketingprofs.com/write-for-us",
    estDA: 86,
    difficulty: "hard",
    niches: ["marketing", "content", "saas", "b2b", "services"],
    dofollowPolicy: "mixed",
    style: {
      wordCount: { min: 1200, ideal: 1700, max: 2500 },
      tone: "B2B-marketer practical, mid-funnel teaching",
      voice: "third or first person editorial",
      mustDo: [
        "Frame around a specific marketer pain point",
        "Reference frameworks (BANT, ICP, CAC:LTV) appropriately",
        "Include 2+ original anecdotes or case data",
      ],
      mustAvoid: ["Listicles without depth", "Vendor pitches"],
      headings: "H2/H3, concrete and informative",
      linking: "1 brand link in bio; contextual cites inline allowed",
    },
  },
  {
    id: "smashing-magazine",
    name: "Smashing Magazine",
    domain: "smashingmagazine.com",
    submitUrl: "https://www.smashingmagazine.com/write-for-us/",
    estDA: 89,
    difficulty: "hard",
    niches: ["web", "design", "frontend", "ux", "tech"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 2000, ideal: 3000, max: 4500 },
      tone: "deep technical / design tutorial, illustrated",
      voice: "first person, expert, conversational",
      mustDo: [
        "Original code samples / live demos",
        "Diagrams or screenshots — visuals are non-optional",
        "Compare 2+ approaches with tradeoffs",
        "Cite browser specs / design research",
      ],
      mustAvoid: ["Surface-level overviews", "Tool-promotion content"],
      headings: "H2 + H3 sentence-case, descriptive",
      linking: "Dofollow inline cites; brand bio link dofollow",
    },
  },
  {
    id: "a-list-apart",
    name: "A List Apart",
    domain: "alistapart.com",
    submitUrl: "https://alistapart.com/about/contribute/",
    estDA: 85,
    difficulty: "hard",
    niches: ["web", "design", "frontend", "publishing", "ux"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 1500, ideal: 2500, max: 4000 },
      tone: "essayistic, craft-focused, opinionated",
      voice: "first person, literary",
      mustDo: ["A clear thesis", "Original perspective", "Beautiful prose"],
      mustAvoid: ["How-to listicles", "Generic best practices"],
      headings: "H2 sparingly",
      linking: "Inline cites dofollow. Author bio dofollow.",
    },
  },
  {
    id: "css-tricks",
    name: "CSS-Tricks",
    domain: "css-tricks.com",
    submitUrl: "https://css-tricks.com/guest-posting/",
    estDA: 90,
    difficulty: "hard",
    niches: ["web", "frontend", "css", "design", "tech"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 1500, ideal: 2500, max: 4000 },
      tone: "practical web-dev tutorial",
      voice: "first person, pragmatic",
      mustDo: ["Working CodePen or repo", "Tradeoffs, not dogma", "Browser support callouts"],
      mustAvoid: ["Tool-shilling", "Outdated techniques"],
      headings: "H2 + H3 informative",
      linking: "Dofollow inline + bio",
    },
  },
  {
    id: "moz-blog",
    name: "Moz Blog",
    domain: "moz.com",
    submitUrl: "https://moz.com/about/jobs/contributors",
    estDA: 92,
    difficulty: "hard",
    niches: ["seo", "marketing", "content", "agency"],
    dofollowPolicy: "mixed",
    style: {
      wordCount: { min: 1500, ideal: 2200, max: 3500 },
      tone: "research-led, evidence-driven",
      voice: "third person editorial",
      mustDo: ["Original data or experiment", "Cite primary sources", "Actionable recap"],
      mustAvoid: ["Speculation", "Affiliate content"],
      headings: "H2/H3 informative",
      linking: "Bio link only; contextual cites inline",
    },
  },
  {
    id: "ahrefs-blog",
    name: "Ahrefs Blog",
    domain: "ahrefs.com",
    submitUrl: "https://ahrefs.com/blog/contribute/",
    estDA: 91,
    difficulty: "hard",
    niches: ["seo", "marketing", "content", "agency"],
    dofollowPolicy: "mixed",
    style: {
      wordCount: { min: 2000, ideal: 3000, max: 5000 },
      tone: "comprehensive, definitive guide",
      voice: "third person editorial, ahrefs-data-heavy",
      mustDo: ["Charts from real data", "Original SERP analysis", "Specific examples with screenshots"],
      mustAvoid: ["Anything covered in their existing pillar pages"],
      headings: "H2/H3 keyword-aware but readable",
      linking: "Bio link only; contextual cites inline",
    },
  },
  {
    id: "growth-hackers",
    name: "GrowthHackers",
    domain: "growthhackers.com",
    submitUrl: "https://growthhackers.com/posts/new",
    estDA: 78,
    difficulty: "medium",
    niches: ["saas", "marketing", "growth", "startup", "services"],
    dofollowPolicy: "nofollow",
    style: {
      wordCount: { min: 600, ideal: 1100, max: 1800 },
      tone: "tactical case study with numbers",
      voice: "first person, story-led",
      mustDo: ["Specific channel + experiment", "Before/after numbers", "Pitfalls"],
      mustAvoid: ["Theory without evidence"],
      headings: "H2 sentence-case",
      linking: "Inline OK. Most are nofollow but the audience converts.",
    },
  },
  {
    id: "ghost",
    name: "Ghost (publish to your own)",
    domain: "ghost.org",
    submitUrl: "https://ghost.org/sign-up/",
    estDA: 81,
    difficulty: "easy",
    niches: ["blog", "newsletter", "media", "creator"],
    dofollowPolicy: "dofollow",
    style: {
      wordCount: { min: 800, ideal: 1400, max: 2500 },
      tone: "essay or guide",
      voice: "first person, polished",
      mustDo: ["A clear theme", "Story arc", "Pull quotes"],
      mustAvoid: ["Filler"],
      headings: "H2 sentence-case",
      linking: "All dofollow on your own publication",
    },
  },
  {
    id: "quora",
    name: "Quora (long-form answer)",
    domain: "quora.com",
    submitUrl: "https://www.quora.com/",
    estDA: 92,
    difficulty: "easy",
    niches: ["all", "saas", "services", "ecommerce", "blog", "local"],
    dofollowPolicy: "nofollow",
    style: {
      wordCount: { min: 300, ideal: 600, max: 1200 },
      tone: "direct expert answer, story-led",
      voice: "first person",
      mustDo: ["Open with the answer in 1-2 lines", "Then expand with 2-3 examples"],
      mustAvoid: ["Self-promotion in the body — Quora down-ranks fast"],
      headings: "Plain paragraphs, no headings needed",
      linking: "1 link max, contextual. Profile bio link is the real value.",
    },
  },
];

/** Pull sites whose `niches` array intersects the client's niche bucket. */
export function pickSitesForNiche(niche: string | null): GuestPostSite[] {
  if (!niche) return GUEST_POST_SITES;
  const buckets = expandNicheBuckets(niche);
  return GUEST_POST_SITES.filter((s) =>
    s.niches.some((n) => buckets.includes(n) || n === "all"),
  );
}

function expandNicheBuckets(n: string): string[] {
  const out = new Set<string>([n]);
  if (n === "saas") {
    out.add("tech");
    out.add("startup");
    out.add("b2b");
    out.add("marketing");
  } else if (n === "blog") {
    out.add("creator");
    out.add("media");
    out.add("newsletter");
  } else if (n === "ecommerce") {
    out.add("marketing");
    out.add("creator");
  } else if (n === "services") {
    out.add("b2b");
    out.add("marketing");
  } else if (n === "local") {
    out.add("services");
  }
  return Array.from(out);
}

export function getGuestPostSiteById(id: string): GuestPostSite | undefined {
  return GUEST_POST_SITES.find((s) => s.id === id);
}
