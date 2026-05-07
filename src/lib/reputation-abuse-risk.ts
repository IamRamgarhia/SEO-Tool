/**
 * Site Reputation Abuse risk scorer.
 *
 * Google's site reputation abuse policy (March 2024, expanded November 2025)
 * targets sites where third-party content rides on the host domain's
 * authority without genuine first-party editorial oversight. Algorithmic
 * detection now identifies "starkly different" sections and treats them as
 * separate entities — the parent's authority does NOT transfer.
 *
 * Practical risks:
 *   - A SaaS site with a /coupons/ subdir written by a third-party affiliate.
 *   - A news site running a "Best of …" review section run by an outside
 *     SEO firm with no editorial oversight.
 *   - A real-estate site with a /finance/ subdir on payday loans.
 *
 * This module:
 *   1) Crawls the homepage + sitemap (or seed URLs) to gather a sample of
 *      pages.
 *   2) Groups them by top-level path segment (/coupons/, /reviews/, /blog/).
 *   3) Extracts a topic signature per group from page titles and H1s.
 *   4) Compares each group's topic signature against the homepage / about
 *      page topic signature. Large divergence = risk.
 *   5) Asks the AI for a one-line risk explanation per flagged section.
 */

import { callAI } from "./ai-call";

const USER_AGENT =
  "Mozilla/5.0 (compatible; seo-tool/1.0; +https://example.com)";

export type SectionRisk = {
  path: string;
  pageCount: number;
  /** Top words in this section's titles + H1s. */
  topicSignature: string[];
  /** Topic overlap with the rest of the site, 0-1. Higher = more aligned. */
  overlap: number;
  /** Risk level derived from overlap + section size. */
  risk: "low" | "medium" | "high";
  /** AI-generated explanation when risk ≥ medium. */
  explanation?: string;
  /** Sample URLs from this section. */
  samples: string[];
};

export type RiskReport = {
  domain: string;
  pagesScanned: number;
  sections: SectionRisk[];
  /** Overall risk = max of any section. */
  overall: "low" | "medium" | "high";
  /** Plain-English summary the user can show clients. */
  summary: string;
};

const STOP = new Set([
  "the","and","for","are","but","not","you","all","can","her","was","one","our",
  "out","day","get","has","him","his","how","man","new","now","old","see","two",
  "way","who","boy","did","its","let","put","say","she","too","use","this","that",
  "with","have","from","they","will","what","were","when","your","there","their",
  "would","could","about","which","because","into","than","then","them","these",
  "those","being","does","just","like","more","over","such","also","very","much",
  "some","most","many","each","still","yet","ever","while","upon","best","top",
  "guide","review","reviews","page","home",
]);

async function fetchText(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,text/xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 800_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractInternalLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  const re = /<a[^>]*\shref=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) && out.size < 200) {
    const href = m[1];
    try {
      const u = new URL(href, base);
      if (u.hostname === new URL(base).hostname) {
        u.hash = "";
        u.search = "";
        out.add(u.toString());
      }
    } catch {
      // ignore
    }
  }
  return Array.from(out);
}

function extractTitleAndH1(html: string): { title: string; h1: string } {
  const title =
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ?? "";
  return { title: title.slice(0, 200), h1: h1.slice(0, 200) };
}

function topPathSegment(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean)[0];
    return seg ? `/${seg}/` : "/";
  } catch {
    return "/";
  }
}

function topicTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

function topNTokens(text: string, n: number): string[] {
  const counts = new Map<string, number>();
  for (const t of topicTokens(text)) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const inter = a.filter((x) => setB.has(x)).length;
  const denom = Math.min(a.length, b.length);
  return denom > 0 ? inter / denom : 0;
}

export async function runReputationAbuseScan(
  rootUrl: string,
  maxPages = 30,
): Promise<RiskReport> {
  let domain = "";
  try {
    domain = new URL(rootUrl).hostname.replace(/^www\./, "");
  } catch {
    return {
      domain: "",
      pagesScanned: 0,
      sections: [],
      overall: "low",
      summary: "Invalid URL.",
    };
  }

  // Seed: homepage. Fan out via internal links.
  const homepage = await fetchText(rootUrl);
  if (!homepage) {
    return {
      domain,
      pagesScanned: 0,
      sections: [],
      overall: "low",
      summary: `Couldn't fetch ${rootUrl}.`,
    };
  }

  const seen = new Set<string>([rootUrl]);
  const queue = extractInternalLinks(homepage, rootUrl).slice(0, maxPages);
  const docs: { url: string; title: string; h1: string; section: string }[] = [];
  const home = extractTitleAndH1(homepage);
  docs.push({
    url: rootUrl,
    title: home.title,
    h1: home.h1,
    section: "/",
  });

  // Fetch pages — keep it small to stay snappy
  for (const url of queue) {
    if (docs.length >= maxPages) break;
    if (seen.has(url)) continue;
    seen.add(url);
    const html = await fetchText(url);
    if (!html) continue;
    const meta = extractTitleAndH1(html);
    docs.push({
      url,
      title: meta.title,
      h1: meta.h1,
      section: topPathSegment(url),
    });
  }

  // Group by top-path segment
  const groups = new Map<string, typeof docs>();
  for (const d of docs) {
    const list = groups.get(d.section) ?? [];
    list.push(d);
    groups.set(d.section, list);
  }

  // Build the "rest of site" topic signature for each group's comparison
  const allText = docs
    .map((d) => `${d.title} ${d.h1}`)
    .join(" ");
  const fullSig = topNTokens(allText, 30);

  const sections: SectionRisk[] = [];
  for (const [path, list] of groups) {
    const text = list.map((d) => `${d.title} ${d.h1}`).join(" ");
    const sig = topNTokens(text, 15);
    const overlap = overlapScore(sig, fullSig);
    const sizeWeight = list.length >= 3 ? 1 : 0.5;
    let risk: SectionRisk["risk"] = "low";
    if (overlap < 0.15 && list.length >= 3) risk = "high";
    else if (overlap < 0.3 && list.length >= 2) risk = "medium";
    sections.push({
      path,
      pageCount: list.length,
      topicSignature: sig.slice(0, 10),
      overlap: Math.round(overlap * 100) / 100,
      risk,
      samples: list.slice(0, 5).map((d) => d.url),
    });
    void sizeWeight;
  }

  // Sort by risk severity
  sections.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return order[a.risk] - order[b.risk];
  });

  // AI explanation for medium+ sections
  for (const s of sections) {
    if (s.risk === "low") continue;
    const text = await callAI({
      system: `You explain to an SEO why a section of a site might be flagged under Google's site reputation abuse policy. Output ONE sentence describing the topical mismatch and ONE sentence with the recommended fix. Plain language, under 80 words total.`,
      user: `Site domain: ${domain}\nSection path: ${s.path}\nThis section has ${s.pageCount} pages. Their top topics: ${s.topicSignature.slice(0, 8).join(", ")}.\nThe rest of the site's top topics: ${fullSig.slice(0, 8).join(", ")}.\nTopic overlap: ${(s.overlap * 100).toFixed(0)}%.`,
      maxTokens: 200,
      temperature: 0.3,
      feature: "general",
    });
    if (text) s.explanation = text.trim();
  }

  const overall: "low" | "medium" | "high" =
    sections.some((s) => s.risk === "high")
      ? "high"
      : sections.some((s) => s.risk === "medium")
        ? "medium"
        : "low";

  let summary = "";
  if (overall === "low")
    summary = `${domain} looks topically coherent — no section stands out as starkly different from the rest of the site.`;
  else if (overall === "medium")
    summary = `${domain} has at least one section that's somewhat off-topic from the main site. Worth checking that it has clear first-party editorial oversight.`;
  else
    summary = `${domain} has at least one section that looks topically separate from the main site. If the content is third-party (affiliates, partners, "powered by"), Google may treat that section as a separate entity and not pass authority.`;

  return {
    domain,
    pagesScanned: docs.length,
    sections,
    overall,
    summary,
  };
}
