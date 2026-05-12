/**
 * Paid-ads skill catalog. The source of truth for the Ad Funnel Architect
 * tool. Each platform entry encodes real-world constraints — character
 * limits, image specs, campaign-objective taxonomy, cost benchmarks,
 * common pitfalls — so the AI prompt can be specific instead of waffling
 * about "engaging copy."
 *
 * Constraint references (all verified against the platforms' own help
 * docs as of 2026 Q1):
 *
 * - Meta Ads Manager — Ad specs reference, Advantage+ campaign setup
 * - Google Ads Help — Responsive Search/Display, Smart Bidding strategies
 * - LinkedIn Campaign Manager — Sponsored Content + Message Ads specs
 * - TikTok Ads Manager — Spark Ads + creative specs
 * - YouTube Ads — TrueView formats + bumper specs
 *
 * Numbers chosen are the practical caps, not the theoretical maxes —
 * e.g. Meta primary text "technically" allows 63K chars but anything
 * past 125 is truncated on the mobile feed where 80% of impressions
 * land, so we cap at 125.
 */

export type AdPlatformId =
  | "meta"
  | "google_search"
  | "google_display"
  | "google_shopping"
  | "linkedin"
  | "tiktok"
  | "youtube";

export type FunnelStage = "awareness" | "consideration" | "conversion" | "retention";

export type BusinessNiche =
  | "local"
  | "ecommerce"
  | "saas_b2b"
  | "saas_b2c"
  | "services"
  | "content_blog"
  | "restaurant"
  | "real_estate"
  | "healthcare"
  | "education"
  | "nonprofit";

export type AdPlatform = {
  id: AdPlatformId;
  name: string;
  emoji: string;
  description: string;

  /** Real format constraints per ad type. */
  copy: {
    /** Primary body text — what appears above the image on Meta/LinkedIn. */
    primaryText?: { charLimit: number; rules: string[] };
    /** Short attention-grabbing headlines. */
    headlines: { maxCount: number; charLimit: number; rules: string[] };
    /** Longer-form descriptions, usually shown below the headline. */
    descriptions?: { maxCount: number; charLimit: number; rules: string[] };
    /** Display URL / business name shown alongside the ad. */
    displayBranding?: { charLimit: number; field: string };
    /** Built-in call-to-action button options. */
    ctaOptions: string[];
  };

  /** Visual asset specs. Omitted for text-only platforms (Google Search). */
  images?: {
    /** Common pixel dimensions the user should produce. */
    dimensions: string[];
    /** Aspect ratios accepted. */
    aspectRatios: string[];
    /** Max file size in MB. */
    maxFileSizeMb: number;
    /** Creative best-practice rules — what makes the asset *perform*, not just pass review. */
    rules: string[];
  };

  /** Campaign objective taxonomy the platform exposes. */
  objectives: string[];

  /** Funnel stages where the platform is *actually* effective (not where it merely runs). */
  effectiveFunnelStages: FunnelStage[];

  /** Business niches where this platform punches above its weight. */
  bestForNiches: BusinessNiche[];

  /** Pitfalls users repeatedly fall into. The AI surfaces these as warnings. */
  pitfalls: string[];

  /** Realistic 2026 cost benchmarks. Rough, but better than nothing. */
  costBenchmarks: {
    typicalCpc?: string;
    typicalCpm?: string;
    minMonthlyBudget: string;
  };

  /**
   * Addendum appended to the AI system prompt when this platform is selected.
   * Encodes the platform's specific style discipline — don't repeat generic
   * "be persuasive" rules across all of them.
   */
  systemAddendum: string;
};

/**
 * The catalog. Update with real constraints as platforms change their
 * specs. Verified against platform help docs 2026 Q1.
 */
export const AD_PLATFORMS: AdPlatform[] = [
  // ─────────────────────────────────────────────────────────────────
  // Meta (Facebook + Instagram)
  // ─────────────────────────────────────────────────────────────────
  {
    id: "meta",
    name: "Meta (Facebook + Instagram)",
    emoji: "📱",
    description:
      "Massive reach, sharp interest targeting, best for visual products and emotional storytelling. Advantage+ is the default in 2026 — let the algorithm find audience.",
    copy: {
      primaryText: {
        charLimit: 125,
        rules: [
          "First 40 chars are the hook — they're all that's visible on mobile before 'See more'",
          "No exclamation marks back-to-back (auto-rejected as spam)",
          "≤20% text in any image (was a hard rule, now a ranking signal)",
          "Address the reader directly: 'you' / 'your' beats third-person every time",
        ],
      },
      headlines: {
        maxCount: 5,
        charLimit: 40,
        rules: [
          "Multi-variant: ship 3-5 headlines, Meta rotates them",
          "Specific number > vague phrase: '7-day trial' beats 'short trial'",
        ],
      },
      descriptions: {
        maxCount: 5,
        charLimit: 30,
        rules: [
          "Shown only on feed placement, not stories",
          "Subordinate to the headline — don't repeat the same point",
        ],
      },
      ctaOptions: [
        "Learn More",
        "Shop Now",
        "Sign Up",
        "Book Now",
        "Subscribe",
        "Get Quote",
        "Download",
        "Contact Us",
        "Apply Now",
      ],
    },
    images: {
      dimensions: ["1080×1080 (feed)", "1080×1350 (feed 4:5)", "1080×1920 (stories/reels)"],
      aspectRatios: ["1:1", "4:5", "9:16"],
      maxFileSizeMb: 30,
      rules: [
        "Native-feeling content outperforms studio shots 2-3x on cost-per-result",
        "Faces in the first 3 seconds of video lift hook rate substantially",
        "Show the product/result, not the brand logo, in the first frame",
        "9:16 is mandatory for Reels — don't crop a 1:1 and hope",
        "Text overlay should be readable at thumb-sized preview (≥32pt equivalent)",
      ],
    },
    objectives: [
      "Awareness",
      "Traffic",
      "Engagement",
      "Leads",
      "App promotion",
      "Sales (Advantage+ Shopping)",
    ],
    effectiveFunnelStages: ["awareness", "consideration", "conversion"],
    bestForNiches: [
      "ecommerce",
      "local",
      "restaurant",
      "saas_b2c",
      "services",
      "education",
      "real_estate",
    ],
    pitfalls: [
      "Targeting too narrow — Advantage+ wants ≥1M addressable; over-narrow audiences inflate CPM 3-5x",
      "Using website CPC bids when objective should be conversions",
      "Boosting posts instead of campaigns — boosts can't access conversion API events",
      "Static-only creative — at minimum ship 1 video + 1 carousel + 2 statics per ad set",
    ],
    costBenchmarks: {
      typicalCpc: "$0.80-$2.50",
      typicalCpm: "$8-$25",
      minMonthlyBudget: "$300 (anything less can't escape the learning phase)",
    },
    systemAddendum: `Meta ads style discipline:
- Lead with the user, not the brand. "You're tired of X" beats "We solve X."
- Show the AFTER state, not the BEFORE problem. Saving-time imagery > stressed-person imagery.
- Mobile is the default — assume 1080×1350 or 1080×1920 vertical, never landscape-first.
- Avoid clickbait or "you won't believe" — Meta downranks aggressively and disapprovals tank account quality.
- Include a soft proof element in copy (rating, customer count, named outcome) — Meta hates vague superlatives.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // Google Search (RSA)
  // ─────────────────────────────────────────────────────────────────
  {
    id: "google_search",
    name: "Google Search (Responsive Search Ads)",
    emoji: "🔍",
    description:
      "Capture demand at the moment of intent. Highest conversion rates of any paid channel; costs scale with keyword competitiveness.",
    copy: {
      headlines: {
        maxCount: 15,
        charLimit: 30,
        rules: [
          "Provide all 15 — Google's testing engine needs the variation",
          "Pin only 2-3; over-pinning prevents the responsive system from working",
          "Each headline should be able to stand alone — they get permuted",
          "Include the primary keyword in at least 3 headlines verbatim",
          "Mix benefit headlines (saves time), feature headlines (free trial), and proof headlines (4.8 stars, 50k users)",
        ],
      },
      descriptions: {
        maxCount: 4,
        charLimit: 90,
        rules: [
          "All 4 descriptions are required for Excellent ad strength",
          "Lead with the strongest benefit; CTA goes at the end of one description",
          "Avoid keyword stuffing — Quality Score penalizes it",
        ],
      },
      displayBranding: {
        charLimit: 15,
        field: "Display path (×2)",
      },
      ctaOptions: [
        "(call-to-action lives inside ad copy, no separate button on Search)",
      ],
    },
    objectives: ["Search Conversions", "Search Traffic", "Lead Form Extensions"],
    effectiveFunnelStages: ["conversion", "retention"],
    bestForNiches: [
      "ecommerce",
      "saas_b2b",
      "saas_b2c",
      "services",
      "local",
      "real_estate",
      "healthcare",
      "education",
    ],
    pitfalls: [
      "Single match type (broad-only or exact-only) — winning campaigns use a layered structure: phrase + exact + negatives",
      "No negative-keyword list — branded queries from competitors and free-tier seekers burn budget",
      "Ignoring search-term reports — that's where you find both the gold (high-intent variants) and the trash (irrelevant matches)",
      "Sending all traffic to the homepage — landing-page relevance is 33% of Quality Score",
      "Using Maximize Clicks bid strategy beyond the first 2 weeks of learning — switch to Target CPA or Maximize Conversions once you have 30+ conv/30 days",
    ],
    costBenchmarks: {
      typicalCpc:
        "$1-$5 (most niches), $15-$100+ (legal, insurance, B2B SaaS keywords)",
      minMonthlyBudget: "$500 (less = not enough conversion volume to optimize)",
    },
    systemAddendum: `Google Search ads style discipline:
- Each headline is 30 chars MAX. Count them. "Best CRM Software 2026" = 22, fine. "The Best CRM Software for Your Business" = 41, will truncate.
- Include the literal keyword in 3+ headlines — boosts ad relevance component of Quality Score.
- Headlines are permuted independently — don't write "Save 50%" + "On All Plans" expecting them to render together.
- Match types: bracket exact match [keyword], "phrase match", broad match (no punctuation).
- For B2B / high-cost niches, always recommend negative keywords for "free", "cheap", "torrent", "crack", competitor names you don't want to bid on.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // Google Display (Responsive Display Ads)
  // ─────────────────────────────────────────────────────────────────
  {
    id: "google_display",
    name: "Google Display Network",
    emoji: "🖼️",
    description:
      "Reach across 35M+ sites + Gmail. Strong for retargeting and assisted conversions; rarely a primary acquisition channel for SMBs.",
    copy: {
      headlines: {
        maxCount: 5,
        charLimit: 30,
        rules: [
          "Same 30-char limit as Search; permuted across placements",
          "Avoid mentioning specific prices — display creative is reused across geographies",
        ],
      },
      descriptions: {
        maxCount: 5,
        charLimit: 90,
        rules: [
          "Combined with images by the responsive engine — don't repeat what the image already shows",
        ],
      },
      displayBranding: {
        charLimit: 25,
        field: "Long headline (1×90 chars) + Business name (25 chars)",
      },
      ctaOptions: [
        "Learn More",
        "Apply Now",
        "Sign Up",
        "Subscribe",
        "Download",
        "Get Quote",
        "Shop Now",
        "Visit Site",
      ],
    },
    images: {
      dimensions: [
        "1200×628 (landscape)",
        "1200×1200 (square)",
        "1080×1080 (square)",
        "300×250 (medium rect, legacy)",
        "728×90 (leaderboard, legacy)",
      ],
      aspectRatios: ["1.91:1", "1:1", "4:5"],
      maxFileSizeMb: 5,
      rules: [
        "Upload 5 image variants — Google's testing engine needs diversity to optimize",
        "≤20% text rule is gone, but text-heavy images still underperform 30-40% in studies",
        "Include both lifestyle imagery AND product close-ups for the engine to test",
        "Logos should be uploaded as a separate logo asset, not baked into the image",
      ],
    },
    objectives: ["Awareness", "Traffic", "Retargeting", "Smart Display Conversions"],
    effectiveFunnelStages: ["awareness", "consideration", "retention"],
    bestForNiches: ["ecommerce", "saas_b2c", "services", "education", "real_estate"],
    pitfalls: [
      "Using Display alone for conversions — it's a top-funnel + retargeting channel, not direct response",
      "No exclusion list — Display will burn budget on mobile games and parked domains by default",
      "Targeting all of Google's placements — start with Custom Intent and In-Market audiences, not 'all of Display'",
    ],
    costBenchmarks: {
      typicalCpc: "$0.40-$2",
      typicalCpm: "$2-$5",
      minMonthlyBudget: "$200",
    },
    systemAddendum: `Google Display ads style discipline:
- Headlines work in COMBINATION with images — don't repeat what the image is showing.
- Display is image-first; copy is support. The user is browsing, not searching — interrupt thoughtfully.
- Always recommend an exclusion list for: mobile-game placements, "parked-domains", explicit content category.
- Best as a retargeting layer, not a cold-traffic acquisition primary.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // Google Shopping
  // ─────────────────────────────────────────────────────────────────
  {
    id: "google_shopping",
    name: "Google Shopping",
    emoji: "🛒",
    description:
      "Product-image-driven ads tied to your Merchant Center feed. Critical channel for any e-commerce — bypasses keyword guessing.",
    copy: {
      headlines: {
        maxCount: 1,
        charLimit: 150,
        rules: [
          "Pulled from the Merchant Center product title — optimize there, not in Ads",
          "Front-load brand + key attribute + identifier: '[Brand] [Type] [Size/Color] - [Material]'",
          "Avoid promotional language ('SALE!', 'FREE SHIPPING!') in titles — they get disapproved",
        ],
      },
      descriptions: {
        maxCount: 1,
        charLimit: 5000,
        rules: [
          "Pulled from Merchant Center; first 160-200 chars matter most",
          "Include attributes Google can structure: material, sizing, GTIN-relevant terms",
        ],
      },
      ctaOptions: ["(Shopping ads have no copy CTA — image + price + title are everything)"],
    },
    images: {
      dimensions: ["≥800×800", "1200×1200 preferred"],
      aspectRatios: ["1:1", "4:3"],
      maxFileSizeMb: 16,
      rules: [
        "White background is the de facto standard — colored backgrounds get auto-cropped weirdly",
        "Product fills 75-90% of frame",
        "No watermarks, no superimposed text, no logos overlapping the product",
        "Upload multiple angles via additional_image_link feed attribute",
      ],
    },
    objectives: ["Standard Shopping", "Performance Max (Shopping component)"],
    effectiveFunnelStages: ["conversion"],
    bestForNiches: ["ecommerce"],
    pitfalls: [
      "Letting product titles auto-import from the storefront without optimization — biggest leverage point in Shopping",
      "No GTIN — disapprovals + lower priority on the SERP",
      "Using Standard Shopping when Performance Max is shipping better ROAS for most merchants in 2026",
    ],
    costBenchmarks: {
      typicalCpc: "$0.50-$2 (varies wildly by vertical)",
      minMonthlyBudget: "$300",
    },
    systemAddendum: `Google Shopping discipline:
- The user can't write headlines in Ads — they're auto-pulled from Merchant Center product titles. Direct optimization to the FEED, not the ad.
- Product title formula that wins: "[Brand] [Type] [Key Attribute] [Size/Color] [Material]". Example: "Nike Pegasus 40 Men's Running Shoes Size 10 Black Mesh".
- Recommend Performance Max over Standard Shopping in 2026 unless the user needs granular control for specific reasons.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // LinkedIn
  // ─────────────────────────────────────────────────────────────────
  {
    id: "linkedin",
    name: "LinkedIn Ads",
    emoji: "💼",
    description:
      "The only platform with reliable job-title / company / seniority targeting. Premium pricing — only worth it for B2B with high deal value (>$5k LTV).",
    copy: {
      primaryText: {
        charLimit: 150,
        rules: [
          "Intro text — first 150 chars are the visible body before truncation",
          "Lead with a counterintuitive insight, not the product name",
          "Hashtags don't help discovery on LinkedIn — skip or use ≤3 at the end",
        ],
      },
      headlines: {
        maxCount: 1,
        charLimit: 70,
        rules: [
          "Only 40 chars visible on mobile — front-load",
          "Headlines are job-title-aware when you use dynamic insertion macros",
        ],
      },
      descriptions: {
        maxCount: 1,
        charLimit: 100,
        rules: [
          "Shown only on certain placements; treat as bonus, not load-bearing",
        ],
      },
      ctaOptions: [
        "Learn More",
        "Visit Website",
        "Apply",
        "Download",
        "Subscribe",
        "Sign Up",
        "Register",
        "Request Demo",
        "Get Quote",
      ],
    },
    images: {
      dimensions: ["1200×627 (landscape, default)", "1200×1200 (square)"],
      aspectRatios: ["1.91:1", "1:1"],
      maxFileSizeMb: 5,
      rules: [
        "Professional > polished — LinkedIn audience is allergic to obvious stock photography",
        "Charts, dashboards, real product screenshots beat lifestyle imagery on B2B engagement rates",
        "Faces still help — but use real team / customer faces, not stock smiles",
        "Avoid the 'professional in a suit pointing at a chart' cliché — performs terribly",
      ],
    },
    objectives: [
      "Brand Awareness",
      "Website Visits",
      "Engagement",
      "Lead Generation (with Lead Gen Forms)",
      "Video Views",
      "Conversions",
    ],
    effectiveFunnelStages: ["awareness", "consideration", "conversion"],
    bestForNiches: ["saas_b2b", "services", "education", "real_estate", "healthcare"],
    pitfalls: [
      "Running LinkedIn ads with deal value under $1k — CPCs of $5-12 make the unit economics impossible",
      "Targeting only by job title — layering seniority + industry + company size is what makes LinkedIn worth the premium",
      "Using LinkedIn Lead Gen Forms but not piping leads into a same-day-followup workflow — 80% of LinkedIn lead value comes from speed",
      "Not enabling Audience Expansion — LinkedIn's targeting is small enough that pure-exact targeting will starve campaigns of impressions",
    ],
    costBenchmarks: {
      typicalCpc: "$5-$12",
      typicalCpm: "$30-$80",
      minMonthlyBudget: "$1500 (the platform's effective floor for any signal)",
    },
    systemAddendum: `LinkedIn ads style discipline:
- The reader is at work, mid-scroll, skeptical. Lead with an insight or a number, not a brand intro.
- Front-load the first 40 chars of headline — that's all mobile shows.
- 150-char intro text is your real estate. Use a counterintuitive insight or a specific number (not "we help businesses grow").
- Recommend Lead Gen Forms over send-to-landing-page when the offer is gated content (whitepapers, demo bookings, webinars).
- Be honest about cost: $5-12 CPC means deal value should be $5k+ LTV for the math to work.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // TikTok
  // ─────────────────────────────────────────────────────────────────
  {
    id: "tiktok",
    name: "TikTok Ads",
    emoji: "🎵",
    description:
      "Native-feeling video reaches Gen Z + Millennials cheaply. Polished ads die; UGC-style ads punch above their CPM.",
    copy: {
      primaryText: {
        charLimit: 100,
        rules: [
          "Display text overlay capped at 100 chars",
          "Hook in first 1.5 seconds — TikTok's scroll velocity is 2-3x Meta's",
        ],
      },
      headlines: {
        maxCount: 1,
        charLimit: 100,
        rules: ["Hook-style; embedded in the caption, not a separate field"],
      },
      ctaOptions: [
        "Shop Now",
        "Sign Up",
        "Learn More",
        "Download",
        "Get Quote",
        "Book Now",
        "Apply Now",
      ],
    },
    images: {
      dimensions: ["1080×1920 (9:16 vertical)"],
      aspectRatios: ["9:16"],
      maxFileSizeMb: 500,
      rules: [
        "Vertical-only. Reusing horizontal video kills performance.",
        "Sound-on creative — don't over-rely on captions",
        "Spark Ads (boost organic posts) outperform branded ads 2x on average — use them",
        "UGC-style (handheld, native, mid-shot creator) beats studio production",
      ],
    },
    objectives: ["Reach", "Traffic", "Video Views", "Lead Generation", "Conversions"],
    effectiveFunnelStages: ["awareness", "consideration"],
    bestForNiches: ["ecommerce", "saas_b2c", "education", "content_blog", "restaurant"],
    pitfalls: [
      "Repurposing Instagram Reels content directly — TikTok's algo can detect IG watermarks and downranks them",
      "Using TikTok for B2B / older demographics — wrong platform for the audience",
      "Optimizing for views instead of conversions — TikTok's view-rate inflation is real",
    ],
    costBenchmarks: {
      typicalCpc: "$0.50-$1.50",
      typicalCpm: "$5-$15",
      minMonthlyBudget: "$300",
    },
    systemAddendum: `TikTok ads style discipline:
- 9:16 vertical only. NEVER recommend horizontal creative for TikTok.
- The hook is the first 1.5 seconds. Open mid-action or mid-statement, never with a brand intro.
- UGC-style (creator-feeling, handheld) outperforms branded studio production substantially.
- Spark Ads (boost existing organic posts) are the highest-ROI format — recommend them first.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // YouTube
  // ─────────────────────────────────────────────────────────────────
  {
    id: "youtube",
    name: "YouTube Ads",
    emoji: "▶️",
    description:
      "Video reach with intent signals from search-and-watch history. TrueView in-stream and YouTube Shorts are the workhorses; bumpers add cheap frequency.",
    copy: {
      headlines: {
        maxCount: 1,
        charLimit: 100,
        rules: ["Companion-banner headline, not in-video — used on desktop placements only"],
      },
      descriptions: {
        maxCount: 1,
        charLimit: 35,
        rules: ["Short description shown below the video on watch pages"],
      },
      ctaOptions: ["Shop Now", "Learn More", "Sign Up", "Subscribe", "Visit Site"],
    },
    images: {
      dimensions: ["1920×1080 (in-stream)", "1080×1920 (Shorts)", "300×60 companion banner"],
      aspectRatios: ["16:9", "9:16"],
      maxFileSizeMb: 256,
      rules: [
        "TrueView skip happens at 5s — front-load the value prop or product reveal",
        "Bumpers are 6s non-skippable; treat them as a punchline format",
        "YouTube Shorts: vertical 9:16, 60s max — same playbook as TikTok",
        "Brand mention in first 5s lifts brand-lift metrics ~20% per Google's own studies",
      ],
    },
    objectives: [
      "Brand Awareness",
      "Video Views",
      "Website Traffic",
      "Leads",
      "Sales (Video action campaigns)",
    ],
    effectiveFunnelStages: ["awareness", "consideration", "conversion"],
    bestForNiches: ["ecommerce", "saas_b2c", "saas_b2b", "education", "services"],
    pitfalls: [
      "Repurposing a 30s TV spot — bad pacing for YouTube viewers conditioned to skip",
      "Skipping the bumper format — bumpers are the cheapest CPM in the Google ecosystem when used as frequency-builders alongside TrueView",
      "Targeting placements (specific channels) only — usually loses to In-Market + Custom Intent targeting",
    ],
    costBenchmarks: {
      typicalCpc: "$0.10-$0.30 (view-based CPV)",
      typicalCpm: "$4-$10",
      minMonthlyBudget: "$500",
    },
    systemAddendum: `YouTube ads style discipline:
- 5-second hook rule: TrueView skips happen at 5s. Get the value prop on-screen by second 3.
- Use bumpers (6s) as cheap frequency on top of TrueView, not as standalone awareness.
- YouTube Shorts (9:16) creative follows the TikTok playbook — don't recycle horizontal landscape spots into Shorts.
- "Brand-first" creative (logo, product close-up) within the first 5s lifts brand recall ~20%.`,
  },
];

export function findAdPlatform(id: string): AdPlatform | null {
  return AD_PLATFORMS.find((p) => p.id === id) ?? null;
}

// ────────────────────────────────────────────────────────────────────
// Business-niche → platform-mix recommender
//
// Hand-curated "what actually works" map. The AI uses this as a prior
// when the user picks a business niche. NOT exhaustive — a starting
// point the user can override.
// ────────────────────────────────────────────────────────────────────

export type PlatformRecommendation = {
  platformId: AdPlatformId;
  stage: FunnelStage;
  /** 0-100; higher = more critical to the mix. */
  priority: number;
  rationale: string;
};

export const NICHE_PLATFORM_MATRIX: Record<BusinessNiche, PlatformRecommendation[]> = {
  local: [
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 90,
      rationale: "Local-intent searches ('plumber near me') are the highest-converting traffic for service businesses — capture them first.",
    },
    {
      platformId: "meta",
      stage: "awareness",
      priority: 70,
      rationale: "Radius targeting + interest layers reach your service area at the lowest CPM. Strong for visual / before-after content.",
    },
    {
      platformId: "google_display",
      stage: "retention",
      priority: 40,
      rationale: "Cheap retargeting layer for visitors who didn't convert.",
    },
  ],
  ecommerce: [
    {
      platformId: "google_shopping",
      stage: "conversion",
      priority: 95,
      rationale: "Product-image-driven, intent-rich. Often the highest ROAS channel for any storefront.",
    },
    {
      platformId: "meta",
      stage: "consideration",
      priority: 85,
      rationale: "Advantage+ Shopping campaigns + Instagram Reels are the workhorse acquisition channel for DTC brands in 2026.",
    },
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 75,
      rationale: "Brand defense (people searching your brand name) + non-branded high-intent queries.",
    },
    {
      platformId: "tiktok",
      stage: "awareness",
      priority: 60,
      rationale: "Cheap top-of-funnel for products with visual demo potential. UGC-style works best.",
    },
    {
      platformId: "google_display",
      stage: "retention",
      priority: 65,
      rationale: "Cart abandonment retargeting + view-product retargeting is mandatory for ecom.",
    },
  ],
  saas_b2b: [
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 90,
      rationale: "B2B buyers research with intent — 'best CRM for [vertical]' and 'X alternatives' queries convert at 3-5x other channels.",
    },
    {
      platformId: "linkedin",
      stage: "consideration",
      priority: 85,
      rationale: "Only platform with reliable job-title + company-size + seniority targeting. Worth the premium CPC for $5k+ ACV products.",
    },
    {
      platformId: "youtube",
      stage: "consideration",
      priority: 55,
      rationale: "Product demo videos + thought-leadership content build category authority cheaply.",
    },
  ],
  saas_b2c: [
    {
      platformId: "meta",
      stage: "consideration",
      priority: 85,
      rationale: "Interest + behavior targeting fits B2C SaaS audience characteristics. Free-trial offers convert well.",
    },
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 80,
      rationale: "Brand + category keywords + competitor alternative queries.",
    },
    {
      platformId: "tiktok",
      stage: "awareness",
      priority: 60,
      rationale: "Productivity-app demos and tool-stack videos perform strongly with Gen Z + millennial audience.",
    },
  ],
  services: [
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 85,
      rationale: "Service searches are high-intent. Capture demand first.",
    },
    {
      platformId: "linkedin",
      stage: "consideration",
      priority: 70,
      rationale: "For professional/B2B services. Skip if consumer-facing.",
    },
    {
      platformId: "meta",
      stage: "awareness",
      priority: 60,
      rationale: "Local services benefit from radius + interest targeting.",
    },
  ],
  content_blog: [
    {
      platformId: "meta",
      stage: "awareness",
      priority: 75,
      rationale: "Cheap reach for newsletter / lead-magnet acquisition. Optimize for email signup as the conversion event.",
    },
    {
      platformId: "tiktok",
      stage: "awareness",
      priority: 55,
      rationale: "Short-form derivative content extends reach to younger audience cheaply.",
    },
  ],
  restaurant: [
    {
      platformId: "meta",
      stage: "consideration",
      priority: 85,
      rationale: "Radius targeting + food photography is the bread-and-butter for restaurants.",
    },
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 80,
      rationale: "Cuisine + 'near me' searches convert directly to reservations / orders.",
    },
    {
      platformId: "tiktok",
      stage: "awareness",
      priority: 50,
      rationale: "Plate-shot videos go viral cheaply; great for new-opening hype.",
    },
  ],
  real_estate: [
    {
      platformId: "meta",
      stage: "awareness",
      priority: 80,
      rationale: "Property photography + radius targeting + lead-form ads. Workhorse for agents.",
    },
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 75,
      rationale: "City + neighborhood + price-range queries are direct-response.",
    },
    {
      platformId: "linkedin",
      stage: "consideration",
      priority: 50,
      rationale: "Only for commercial / luxury / investor-grade properties — consumer real estate doesn't pencil at LinkedIn CPCs.",
    },
  ],
  healthcare: [
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 90,
      rationale: "Patients search with high intent. Compliance-friendly + measurable.",
    },
    {
      platformId: "meta",
      stage: "awareness",
      priority: 55,
      rationale: "Strict ad policy — works for general wellness; avoid for prescription / treatment ads.",
    },
  ],
  education: [
    {
      platformId: "meta",
      stage: "consideration",
      priority: 80,
      rationale: "Course offer + free-resource hooks work strongly; lead-form ads + lookalikes from students.",
    },
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 75,
      rationale: "Specific program + certification + 'best course for X' searches are high-intent.",
    },
    {
      platformId: "linkedin",
      stage: "consideration",
      priority: 65,
      rationale: "Worth it for professional / executive / MBA-level offers; skip for K-12 or hobby learning.",
    },
    {
      platformId: "tiktok",
      stage: "awareness",
      priority: 60,
      rationale: "EduTok is huge — bite-size learning content drives strong CPM.",
    },
  ],
  nonprofit: [
    {
      platformId: "meta",
      stage: "awareness",
      priority: 80,
      rationale: "Cause-led emotional storytelling works on Meta. Google Ad Grants ($10K/mo free) cover Search.",
    },
    {
      platformId: "google_search",
      stage: "conversion",
      priority: 75,
      rationale: "Apply for Google Ad Grants first — $10K/mo of free Search ads.",
    },
  ],
};

export const NICHE_LABELS: Record<BusinessNiche, string> = {
  local: "Local services",
  ecommerce: "E-commerce / DTC",
  saas_b2b: "B2B SaaS",
  saas_b2c: "B2C SaaS",
  services: "Professional services",
  content_blog: "Content / blog / media",
  restaurant: "Restaurant / hospitality",
  real_estate: "Real estate",
  healthcare: "Healthcare / wellness",
  education: "Education / courses",
  nonprofit: "Nonprofit",
};

// ────────────────────────────────────────────────────────────────────
// Funnel-stage framework
// ────────────────────────────────────────────────────────────────────

export const FUNNEL_STAGE_META: Record<
  FunnelStage,
  { label: string; description: string; emoji: string }
> = {
  awareness: {
    label: "Awareness (top of funnel)",
    description:
      "Cold audience that doesn't know you exist. Goal: brand recall + interest, not direct sales. Measure on view-through, scroll-depth, video-watch %, CPM.",
    emoji: "👁️",
  },
  consideration: {
    label: "Consideration (middle of funnel)",
    description:
      "Warmed-up audience: site visitors, video viewers, social engagers, lookalikes. Goal: capture them as a lead / start a trial / get them to a comparison page. Measure on lead cost, trial signup, time-on-site.",
    emoji: "🤔",
  },
  conversion: {
    label: "Conversion (bottom of funnel)",
    description:
      "High-intent: searched a buying query, abandoned cart, viewed pricing. Goal: close the sale. Measure on CPA, ROAS, last-click conversions.",
    emoji: "💰",
  },
  retention: {
    label: "Retention",
    description:
      "Existing customers. Goal: repeat purchase, upsell, win-back, advocacy. Measure on repeat purchase rate, LTV expansion, churn save rate.",
    emoji: "🔁",
  },
};

// ────────────────────────────────────────────────────────────────────
// Master system prompt for the Ad Funnel Architect.
// Composed with platform-specific addendums at call time.
// ────────────────────────────────────────────────────────────────────

export const ADS_MASTER_SYSTEM_PROMPT = `You are a senior paid-media strategist building real, ready-to-launch ad campaigns. You know Meta Ads Manager, Google Ads, LinkedIn Campaign Manager, TikTok Ads Manager, and YouTube Ads inside-out.

Non-negotiable rules:
1. Every piece of ad copy you output respects the exact character limits the platform enforces. If you exceed, the ad gets disapproved — that's a failure.
2. You output ready-to-paste copy, not "ideas for copy". Every required field is filled.
3. You make platform-mix recommendations based on the BUSINESS, not based on what's trendy. Sometimes the answer is "don't run on LinkedIn — your deal value is too low to make $8 CPCs work."
4. You produce funnel-stage-aware creative — awareness ads, consideration ads, and conversion ads are written differently. Don't write "Buy Now!" for an awareness campaign.
5. For Google Search, you provide 15 distinct headlines and 4 distinct descriptions — not 5 headlines duplicated. Match types are bracketed correctly ([exact], "phrase", broad).
6. For visual platforms, you output image-generation prompts ready for MidJourney / DALL-E / Stable Diffusion. Specify subject, composition, lighting, style, and aspect ratio.
7. You include negative-keyword recommendations for Google Search to prevent budget waste.
8. You are honest about budget floors. If a platform won't work under $500/mo for this business, say so.
9. You give a tracking setup: UTM parameter convention + which conversions to wire as primary vs secondary.
10. You NEVER hallucinate specific stats ("studies show 47.3%..."). If you reference a stat, it's directionally true and approximate.`;

// ────────────────────────────────────────────────────────────────────
// Helper — render the relevant skill addendums for a chosen platform set
// ────────────────────────────────────────────────────────────────────

export function renderAdSkillContext(opts: {
  platformIds: AdPlatformId[];
  niche: BusinessNiche | null;
}): string {
  const lines: string[] = [];
  lines.push(`[Selected platforms]`);
  for (const id of opts.platformIds) {
    const p = findAdPlatform(id);
    if (!p) continue;
    lines.push(``);
    lines.push(`--- ${p.name} ---`);
    lines.push(p.systemAddendum);
    lines.push(``);
    lines.push(`Constraints:`);
    if (p.copy.primaryText) {
      lines.push(`  Primary text: ≤${p.copy.primaryText.charLimit} chars`);
    }
    lines.push(
      `  Headlines: up to ${p.copy.headlines.maxCount}, ≤${p.copy.headlines.charLimit} chars each`,
    );
    if (p.copy.descriptions) {
      lines.push(
        `  Descriptions: up to ${p.copy.descriptions.maxCount}, ≤${p.copy.descriptions.charLimit} chars each`,
      );
    }
    lines.push(`  CTA options: ${p.copy.ctaOptions.join(", ")}`);
    if (p.images) {
      lines.push(`  Image dimensions: ${p.images.dimensions.join(", ")}`);
      lines.push(`  Aspect ratios: ${p.images.aspectRatios.join(", ")}`);
    }
    lines.push(
      `  Budget floor: ${p.costBenchmarks.minMonthlyBudget}; typical CPC: ${p.costBenchmarks.typicalCpc ?? "—"}`,
    );
  }

  if (opts.niche && NICHE_PLATFORM_MATRIX[opts.niche]) {
    lines.push(``);
    lines.push(`[Niche prior — ${NICHE_LABELS[opts.niche]}]`);
    lines.push(`Recommended platform mix for this niche:`);
    for (const r of NICHE_PLATFORM_MATRIX[opts.niche]) {
      lines.push(`  - ${r.platformId} (${r.stage}, priority ${r.priority}/100): ${r.rationale}`);
    }
  }

  return lines.join("\n");
}
