/**
 * Author topic-authority tracker.
 *
 * Given a competitor or partner domain, find the named authors writing in
 * the niche and score each on a heuristic 0-100 authority signal:
 *
 *   - +10 if a /author/<slug>/ page exists with a real bio
 *   - +20 if their bio includes credentials / years experience
 *   - +5 per high-quality external profile in their bio (Twitter, LinkedIn,
 *     GitHub, ORCID, Wikipedia)
 *   - +10 if they have ≥10 posts on the domain
 *   - +5 per matched topic from the niche keyword list
 *
 * Use cases:
 *   1) Spot competitor authors who have strong E-E-A-T signals → reach out
 *      for guest collaboration / co-authored research / podcast.
 *   2) Benchmark your own author bylines vs competitors — if their authors
 *      have Wikipedia and yours don't, that's a fixable gap.
 *   3) Identify authors who publish frequently in your niche and might be
 *      worth recruiting.
 */

import { db } from "@/db/client";
import {
  authorAuthorityRecords,
  type NewAuthorAuthorityRecord,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

const USER_AGENT =
  "Mozilla/5.0 (compatible; seo-tool-author-tracker/1.0; +https://example.com)";

const AUTHORITY_PROFILE_HOSTS = [
  "twitter.com",
  "x.com",
  "linkedin.com",
  "github.com",
  "orcid.org",
  "wikipedia.org",
  "scholar.google.com",
  "researchgate.net",
];

const CRED_HINTS = [
  "phd",
  "ph.d",
  "m\\.s",
  "msc",
  "mba",
  "certified",
  "founder",
  "co-founder",
  "ceo",
  "cto",
  "head of",
  "director of",
  "lead",
  "senior",
  "principal",
  "years of experience",
  "years in",
];

function extractAllLinks(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /<a[^>]*\shref=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 600) {
    try {
      const u = new URL(m[1], base);
      out.push(u.toString());
    } catch {
      // ignore
    }
  }
  return out;
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 600_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export type AuthorObservation = {
  domain: string;
  authorName: string;
  authorUrl: string | null;
  jobTitle: string | null;
  bio: string | null;
  topics: string[];
  sameAs: string[];
  authorityScore: number;
  postCount: number;
};

function scoreAuthor(opts: {
  hasBio: boolean;
  bioText: string;
  sameAs: string[];
  postCount: number;
  topicMatches: number;
}): number {
  let s = 0;
  if (opts.hasBio) s += 10;
  const bioLower = opts.bioText.toLowerCase();
  const credHits = CRED_HINTS.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(bioLower)).length;
  if (credHits > 0) s += Math.min(20, credHits * 5);
  const profileHits = opts.sameAs.filter((u) =>
    AUTHORITY_PROFILE_HOSTS.some((h) => u.includes(h)),
  ).length;
  s += Math.min(20, profileHits * 5);
  if (opts.postCount >= 10) s += 10;
  else if (opts.postCount >= 3) s += 5;
  s += Math.min(15, opts.topicMatches * 5);
  return Math.max(0, Math.min(100, s));
}

/**
 * Crawl the homepage / blog index to find /author/ links, then visit each
 * author page and extract bio + sameAs + post count.
 *
 * Many sites use these patterns; we try the most common:
 *   /author/<slug>/, /authors/<slug>/, /writer/<slug>/, /contributors/<slug>/
 */
export async function scanDomainAuthors(opts: {
  domain: string;
  niche?: string | null;
  topicHints?: string[];
  maxAuthors?: number;
}): Promise<AuthorObservation[]> {
  const max = opts.maxAuthors ?? 20;
  const root = `https://${opts.domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  const homeHtml = await fetchHtml(root);
  if (!homeHtml) return [];

  const links = extractAllLinks(homeHtml, root);

  // Author URL detection. We accept several conventions.
  const authorUrls = new Set<string>();
  for (const href of links) {
    if (
      /\/(author|authors|writer|writers|contributor|contributors|by|team)\/[^/?#]+\/?$/i.test(
        href,
      )
    ) {
      authorUrls.add(href.split("?")[0].split("#")[0]);
    }
    if (authorUrls.size >= max * 2) break;
  }

  // Crawl /blog/ too if there's a link
  const blogLink = links.find((l) => /\/blog\/?$|\/posts?\/?$/i.test(l));
  if (blogLink) {
    const blogHtml = await fetchHtml(blogLink);
    if (blogHtml) {
      const blogLinks = extractAllLinks(blogHtml, blogLink);
      for (const href of blogLinks) {
        if (
          /\/(author|authors|writer|writers|contributor|contributors|by|team)\/[^/?#]+\/?$/i.test(
            href,
          )
        ) {
          authorUrls.add(href.split("?")[0].split("#")[0]);
        }
      }
    }
  }

  const results: AuthorObservation[] = [];
  const topicHints = opts.topicHints ?? [];

  for (const authorUrl of Array.from(authorUrls).slice(0, max)) {
    const html = await fetchHtml(authorUrl);
    if (!html) continue;

    // Author name from h1 or title
    const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    let authorName = stripTags(h1) || stripTags(title);
    authorName = authorName.replace(/\s*[|·-].*/, "").trim().slice(0, 80);
    if (!authorName) continue;

    // Bio = longest paragraph between 40 and 1500 chars
    let bio = "";
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
    for (const para of paragraphs) {
      const txt = stripTags(para);
      if (txt.length > bio.length && txt.length > 40 && txt.length < 1500) {
        bio = txt;
      }
    }
    // Also check for explicit bio classes
    const bioClassMatch = html.match(
      /<[^>]*class=["'][^"']*(?:bio|author-bio|description)[^"']*["'][^>]*>([\s\S]{0,2000}?)<\/[^>]+>/i,
    );
    if (bioClassMatch) {
      const txt = stripTags(bioClassMatch[1]);
      if (txt.length > 40 && txt.length < 1500) bio = txt;
    }

    // Job title heuristic — meta tag or itemprop
    const jobMatch =
      html.match(
        /<[^>]*itemprop=["']jobTitle["'][^>]*>([^<]{2,80})/i,
      )?.[1] ??
      html.match(
        /<[^>]*class=["'][^"']*job-title[^"']*["'][^>]*>([^<]{2,80})/i,
      )?.[1] ??
      null;
    const jobTitle = jobMatch ? jobMatch.trim().slice(0, 80) : null;

    // sameAs links — match all <a href>, filter to authority hosts
    const sameAs = new Set<string>();
    const linkRe = /<a[^>]*\shref=["']([^"']+)["']/gi;
    let lm;
    while ((lm = linkRe.exec(html))) {
      const href = lm[1];
      try {
        const u = new URL(href, authorUrl);
        if (AUTHORITY_PROFILE_HOSTS.some((h) => u.hostname.includes(h))) {
          sameAs.add(u.toString());
        }
      } catch {
        // ignore
      }
      if (sameAs.size >= 10) break;
    }

    // Post count = links pointing to slug pages on the same domain
    const postLinks = new Set<string>();
    const sameDomainRe = /<a[^>]*\shref=["']([^"']+)["']/gi;
    let pm;
    const authorHost = (() => {
      try {
        return new URL(authorUrl).hostname;
      } catch {
        return "";
      }
    })();
    while ((pm = sameDomainRe.exec(html))) {
      try {
        const u = new URL(pm[1], authorUrl);
        if (
          u.hostname === authorHost &&
          u.pathname.split("/").filter(Boolean).length >= 2 &&
          !u.pathname.includes("/author") &&
          !u.pathname.includes("/category") &&
          !u.pathname.includes("/tag")
        ) {
          postLinks.add(u.toString());
        }
      } catch {
        // ignore
      }
    }
    const postCount = postLinks.size;

    // Topic matching against hints + niche label
    const allText = `${authorName} ${jobTitle ?? ""} ${bio}`.toLowerCase();
    const topics = topicHints
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && allText.includes(t));
    if (opts.niche && allText.includes(opts.niche.toLowerCase()))
      topics.push(opts.niche.toLowerCase());

    const authorityScore = scoreAuthor({
      hasBio: bio.length > 30,
      bioText: bio,
      sameAs: Array.from(sameAs),
      postCount,
      topicMatches: topics.length,
    });

    results.push({
      domain: opts.domain,
      authorName,
      authorUrl,
      jobTitle,
      bio: bio.slice(0, 1000),
      topics,
      sameAs: Array.from(sameAs),
      authorityScore,
      postCount,
    });
  }

  results.sort((a, b) => b.authorityScore - a.authorityScore);
  return results;
}

export async function persistAuthors(opts: {
  clientId: number;
  observations: AuthorObservation[];
}): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  for (const o of opts.observations) {
    // Upsert by (clientId, domain, authorName)
    const existing = await db
      .select()
      .from(authorAuthorityRecords)
      .where(
        and(
          eq(authorAuthorityRecords.clientId, opts.clientId),
          eq(authorAuthorityRecords.domain, o.domain),
          eq(authorAuthorityRecords.authorName, o.authorName),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(authorAuthorityRecords)
        .set({
          authorUrl: o.authorUrl,
          jobTitle: o.jobTitle,
          bio: o.bio,
          postCount: o.postCount,
          topics: o.topics,
          sameAs: o.sameAs,
          authorityScore: o.authorityScore,
          lastSeen: new Date(),
        })
        .where(eq(authorAuthorityRecords.id, existing[0].id));
      updated++;
    } else {
      const insert: NewAuthorAuthorityRecord = {
        clientId: opts.clientId,
        domain: o.domain,
        authorName: o.authorName,
        authorUrl: o.authorUrl,
        jobTitle: o.jobTitle,
        bio: o.bio,
        postCount: o.postCount,
        topics: o.topics,
        sameAs: o.sameAs,
        authorityScore: o.authorityScore,
      };
      await db.insert(authorAuthorityRecords).values(insert);
      inserted++;
    }
  }
  return { inserted, updated };
}
