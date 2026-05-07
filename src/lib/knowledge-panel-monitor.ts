/**
 * Knowledge Panel monitor.
 *
 * Periodically captures Google's brand Knowledge Panel for a tracked client
 * (or arbitrary brand query) and stores a snapshot. Diffs between snapshots
 * surface changes:
 *   - description rewritten
 *   - founder / headquarters fact changed
 *   - sameAs URL added/removed (Wikipedia, Crunchbase)
 *   - social profile reordered or removed
 *   - image swapped
 *
 * Each of these can correlate with brand reputation events that an SEO
 * needs to be aware of.
 *
 * Implementation: Playwright via the shared browser pool. Pulls Google
 * brand-search results page and extracts the right-rail Knowledge Panel
 * via DOM selectors. Falls back to "panel not present" if not found —
 * many smaller brands won't have one yet.
 */

import { withBrowserPage } from "./browser-pool";
import { db } from "@/db/client";
import { knowledgePanelSnapshots, type NewKnowledgePanelSnapshot } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export type KnowledgePanelData = {
  present: boolean;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  sameAs: string[];
  socials: string[];
  facts: { label: string; value: string }[];
  rawHtmlSnippet: string | null;
};

export async function captureKnowledgePanel(
  query: string,
): Promise<KnowledgePanelData> {
  const trimmed = query.trim();
  if (!trimmed) {
    return emptyPanel();
  }
  return withBrowserPage(async (page) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}&hl=en`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
      // Knowledge panel selectors are unstable; we try a few known patterns.
      const data = await page.evaluate(() => {
        type Out = {
          present: boolean;
          title: string | null;
          subtitle: string | null;
          description: string | null;
          imageUrl: string | null;
          sameAs: string[];
          socials: string[];
          facts: { label: string; value: string }[];
          rawHtmlSnippet: string | null;
        };
        const out: Out = {
          present: false,
          title: null,
          subtitle: null,
          description: null,
          imageUrl: null,
          sameAs: [],
          socials: [],
          facts: [],
          rawHtmlSnippet: null,
        };
        // Multiple selectors used historically by Google
        const panel =
          document.querySelector('div[data-attrid="kc:/common/topic:image"]')
            ?.closest("div[role='complementary']") ||
          document.querySelector("div[role='complementary']") ||
          document.querySelector("g-card.kp-blk") ||
          document.querySelector(".knowledge-panel") ||
          null;
        if (!panel) return out;
        out.present = true;
        out.rawHtmlSnippet = (panel as HTMLElement).innerHTML.slice(0, 32_000);

        const title = panel.querySelector("h2, h3, [data-attrid='title']");
        if (title) out.title = title.textContent?.trim() ?? null;
        const subtitle = panel.querySelector(
          "[data-attrid='subtitle'], div.wwUB2c",
        );
        if (subtitle) out.subtitle = subtitle.textContent?.trim() ?? null;
        // First long-text block is usually the description
        const desc = Array.from(
          panel.querySelectorAll("div, span"),
        ).find((el) => {
          const t = el.textContent ?? "";
          return t.length > 100 && t.length < 800;
        });
        if (desc) out.description = desc.textContent?.trim() ?? null;
        const img = panel.querySelector("img");
        if (img) out.imageUrl = (img as HTMLImageElement).src;

        // sameAs / social links inside panel
        const links = Array.from(panel.querySelectorAll("a[href]"));
        const sameAs = new Set<string>();
        const socials = new Set<string>();
        for (const a of links) {
          const href = (a as HTMLAnchorElement).href;
          if (!href) continue;
          if (
            /facebook\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com/i.test(
              href,
            )
          ) {
            socials.add(href);
          } else if (/wikipedia\.org|crunchbase\.com|imdb\.com|en\.wikipedia/i.test(href)) {
            sameAs.add(href);
          }
        }
        out.sameAs = Array.from(sameAs);
        out.socials = Array.from(socials);

        // Facts: rows like "Founder: ...", "Headquarters: ..."
        const factRows = panel.querySelectorAll(
          "[data-attrid^='kc:'], [data-md='kc:']",
        );
        for (const row of Array.from(factRows).slice(0, 12)) {
          const text = row.textContent ?? "";
          // Format usually "Label: Value"
          const m = text.match(/^([^:\n]{2,40}):\s*(.+)/);
          if (m) {
            out.facts.push({
              label: m[1].trim().slice(0, 60),
              value: m[2].trim().slice(0, 200),
            });
          }
        }
        return out;
      });
      return data ?? emptyPanel();
    } catch {
      return emptyPanel();
    }
  });
}

function emptyPanel(): KnowledgePanelData {
  return {
    present: false,
    title: null,
    subtitle: null,
    description: null,
    imageUrl: null,
    sameAs: [],
    socials: [],
    facts: [],
    rawHtmlSnippet: null,
  };
}

/**
 * Capture + persist + return diff against most recent prior snapshot.
 */
export async function captureAndStore(opts: {
  clientId: number;
  query: string;
}): Promise<{ snapshotId: number; data: KnowledgePanelData; changes: string[] }> {
  const data = await captureKnowledgePanel(opts.query);

  const prev = await db
    .select()
    .from(knowledgePanelSnapshots)
    .where(eq(knowledgePanelSnapshots.clientId, opts.clientId))
    .orderBy(desc(knowledgePanelSnapshots.capturedAt))
    .limit(1);

  const insert: NewKnowledgePanelSnapshot = {
    clientId: opts.clientId,
    query: opts.query,
    present: data.present,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    imageUrl: data.imageUrl,
    sameAs: data.sameAs,
    socials: data.socials,
    facts: data.facts,
    rawHtml: data.rawHtmlSnippet,
  };
  const inserted = await db
    .insert(knowledgePanelSnapshots)
    .values(insert)
    .returning({ id: knowledgePanelSnapshots.id });

  const changes: string[] = [];
  if (prev[0]) {
    const p = prev[0];
    if (p.present !== data.present) {
      changes.push(
        data.present
          ? "Knowledge Panel appeared (was absent before)."
          : "Knowledge Panel DISAPPEARED — investigate immediately.",
      );
    }
    if (p.description && p.description !== data.description) {
      changes.push("Description changed.");
    }
    if (p.imageUrl && p.imageUrl !== data.imageUrl) {
      changes.push("Image changed.");
    }
    const prevSameAs = new Set(p.sameAs ?? []);
    const newSameAs = new Set(data.sameAs);
    for (const u of newSameAs)
      if (!prevSameAs.has(u)) changes.push(`sameAs added: ${u}`);
    for (const u of prevSameAs)
      if (!newSameAs.has(u)) changes.push(`sameAs REMOVED: ${u}`);
    const prevSocials = new Set(p.socials ?? []);
    const newSocials = new Set(data.socials);
    for (const u of newSocials)
      if (!prevSocials.has(u)) changes.push(`Social added: ${u}`);
    for (const u of prevSocials)
      if (!newSocials.has(u)) changes.push(`Social REMOVED: ${u}`);
    const prevFactsByLabel = new Map(
      (p.facts ?? []).map((f) => [f.label, f.value]),
    );
    const newFactsByLabel = new Map(data.facts.map((f) => [f.label, f.value]));
    for (const [k, v] of newFactsByLabel) {
      const old = prevFactsByLabel.get(k);
      if (old === undefined) changes.push(`Fact added: ${k}=${v}`);
      else if (old !== v) changes.push(`Fact changed: ${k}: "${old}" → "${v}"`);
    }
    for (const [k] of prevFactsByLabel) {
      if (!newFactsByLabel.has(k)) changes.push(`Fact REMOVED: ${k}`);
    }
  } else if (data.present) {
    changes.push("First Knowledge Panel snapshot captured.");
  }

  return { snapshotId: inserted[0].id, data, changes };
}
