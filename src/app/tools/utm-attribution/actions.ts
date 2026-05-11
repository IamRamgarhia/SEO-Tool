"use server";

import { saveToolRun } from "@/lib/tool-runs";

export type UtmTouch = {
  timestamp: string;
  campaign: string;
  source: string;
  medium: string;
  content?: string;
  term?: string;
  landingPath?: string;
  sessionId?: string;
  userId?: string;
};

export type ChannelStats = {
  channel: string;
  firstTouches: number;
  lastTouches: number;
  assistedTouches: number;
  linearCredit: number;
  positionCredit: number;
  /** Conversions where this channel was anywhere in the path. */
  pathInclusion: number;
};

export type AttributionResult = {
  totalTouches: number;
  totalConversions: number;
  uniqueUsers: number;
  /** Stats per channel — first-touch, last-touch, assisted, linear, position-based. */
  channels: ChannelStats[];
  /** Top conversion paths as channel sequences. */
  topPaths: { path: string[]; count: number }[];
  averagePathLength: number;
};

const CHANNEL_RULES: { medium: RegExp; channel: string }[] = [
  { medium: /^(?:cpc|paid|ppc|paid_social|paidsocial)$/i, channel: "Paid Search" },
  { medium: /^(?:social|paid_social|paidsocial)$/i, channel: "Paid Social" },
  { medium: /^(?:organic)$/i, channel: "Organic Search" },
  { medium: /^(?:email|newsletter)$/i, channel: "Email" },
  { medium: /^(?:referral)$/i, channel: "Referral" },
  { medium: /^(?:affiliate)$/i, channel: "Affiliate" },
  { medium: /^(?:display|banner)$/i, channel: "Display" },
  { medium: /^(?:video)$/i, channel: "Video" },
  { medium: /^(?:none|\(none\)|direct)$/i, channel: "Direct" },
];

function classifyChannel(t: UtmTouch): string {
  if (!t.source && !t.medium) return "Direct";
  // Specific source overrides
  const src = t.source.toLowerCase();
  if (/^(google|bing|yahoo|duckduckgo)$/.test(src)) {
    return t.medium.toLowerCase().startsWith("cpc") ||
      t.medium.toLowerCase().includes("paid")
      ? "Paid Search"
      : "Organic Search";
  }
  if (/^(facebook|instagram|tiktok|linkedin|x|twitter|reddit|pinterest|youtube)$/.test(
    src,
  )) {
    return t.medium.toLowerCase().includes("paid") ? "Paid Social" : "Social";
  }
  for (const r of CHANNEL_RULES) {
    if (r.medium.test(t.medium)) return r.channel;
  }
  if (t.medium) return `Other (${t.medium})`;
  return "Direct";
}

/**
 * Parse pasted touch data. Accepts CSV with header row or whitespace
 * separated columns. Required columns: timestamp, source, medium,
 * campaign. Optional: content, term, landingPath, sessionId, userId,
 * isConversion (1/0).
 */
function parsePastedTouches(
  raw: string,
): { touches: UtmTouch[]; conversions: Set<string> } {
  const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return { touches: [], conversions: new Set() };
  const header = lines[0]
    .split(/,|\t/)
    .map((s) => s.trim().toLowerCase().replace(/^"|"$/g, ""));
  // If header doesn't include expected fields, assume no header (raw)
  const hasHeader =
    header.includes("timestamp") ||
    header.includes("source") ||
    header.includes("medium");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const idx = (name: string) => header.indexOf(name);
  const touches: UtmTouch[] = [];
  const conversions = new Set<string>();
  for (const line of dataLines) {
    const cols = line
      .split(/,|\t/)
      .map((s) => s.trim().replace(/^"|"$/g, ""));
    const get = (key: string) =>
      hasHeader && idx(key) >= 0 ? cols[idx(key)] ?? "" : "";
    const t: UtmTouch = {
      timestamp: get("timestamp") || new Date().toISOString(),
      source: get("source") || cols[1] || "",
      medium: get("medium") || cols[2] || "",
      campaign: get("campaign") || cols[3] || "",
      content: get("content") || undefined,
      term: get("term") || undefined,
      landingPath: get("landingpath") || get("landing_path") || undefined,
      sessionId: get("sessionid") || get("session_id") || undefined,
      userId: get("userid") || get("user_id") || cols[0] || undefined,
    };
    if (!t.source && !t.medium) continue;
    touches.push(t);
    if (
      get("isconversion") === "1" ||
      get("is_conversion") === "1" ||
      get("conversion") === "1"
    ) {
      if (t.userId) conversions.add(t.userId);
    }
  }
  // If no explicit conversions, treat every user's final touch as one
  if (conversions.size === 0) {
    for (const t of touches) {
      if (t.userId) conversions.add(t.userId);
    }
  }
  return { touches, conversions };
}

export type AttrState =
  | { ok: true; result: AttributionResult }
  | { ok: false; error: string }
  | null;

export async function runAttribution(
  _prev: AttrState,
  formData: FormData,
): Promise<AttrState> {
  const raw = String(formData.get("touches") ?? "").trim();
  if (!raw) return { ok: false, error: "Paste touch data first." };
  const { touches, conversions } = parsePastedTouches(raw);
  if (touches.length === 0) {
    return { ok: false, error: "Couldn't parse any touches." };
  }

  // Group touches by user
  const byUser = new Map<string, UtmTouch[]>();
  for (const t of touches) {
    const u = t.userId || `anon-${Math.random()}`;
    const list = byUser.get(u) ?? [];
    list.push(t);
    byUser.set(u, list);
  }
  for (const [, list] of byUser) {
    list.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  }

  const channels = new Map<string, ChannelStats>();
  const getCs = (c: string): ChannelStats => {
    if (!channels.has(c)) {
      channels.set(c, {
        channel: c,
        firstTouches: 0,
        lastTouches: 0,
        assistedTouches: 0,
        linearCredit: 0,
        positionCredit: 0,
        pathInclusion: 0,
      });
    }
    return channels.get(c)!;
  };

  const paths: string[][] = [];

  for (const [userId, userTouches] of byUser) {
    if (!conversions.has(userId)) continue;
    const path = userTouches.map((t) => classifyChannel(t));
    paths.push(path);

    // First-touch
    getCs(path[0]).firstTouches += 1;
    // Last-touch
    getCs(path[path.length - 1]).lastTouches += 1;
    // Assisted = all in path that are neither first nor last
    if (path.length > 2) {
      for (const c of path.slice(1, -1)) {
        getCs(c).assistedTouches += 1;
      }
    }
    // Linear credit: 1 / path.length per touch
    for (const c of path) {
      getCs(c).linearCredit += 1 / path.length;
    }
    // Position-based: 40% first, 40% last, 20% split between middle
    if (path.length === 1) {
      getCs(path[0]).positionCredit += 1;
    } else if (path.length === 2) {
      getCs(path[0]).positionCredit += 0.5;
      getCs(path[1]).positionCredit += 0.5;
    } else {
      getCs(path[0]).positionCredit += 0.4;
      getCs(path[path.length - 1]).positionCredit += 0.4;
      const midShare = 0.2 / (path.length - 2);
      for (const c of path.slice(1, -1)) {
        getCs(c).positionCredit += midShare;
      }
    }
    // Path inclusion: each distinct channel in the path gets a +1
    const distinct = new Set(path);
    for (const c of distinct) getCs(c).pathInclusion += 1;
  }

  // Sort channels by linear credit
  const channelsSorted = Array.from(channels.values())
    .map((c) => ({
      ...c,
      linearCredit: Math.round(c.linearCredit * 100) / 100,
      positionCredit: Math.round(c.positionCredit * 100) / 100,
    }))
    .sort((a, b) => b.linearCredit - a.linearCredit);

  // Top path sequences
  const pathCounts = new Map<string, { path: string[]; count: number }>();
  for (const p of paths) {
    const key = p.join(" → ");
    const v = pathCounts.get(key) ?? { path: p, count: 0 };
    v.count += 1;
    pathCounts.set(key, v);
  }
  const topPaths = Array.from(pathCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const result: AttributionResult = {
    totalTouches: touches.length,
    totalConversions: conversions.size,
    uniqueUsers: byUser.size,
    channels: channelsSorted,
    topPaths,
    averagePathLength:
      paths.length === 0
        ? 0
        : Math.round(
            (paths.reduce((s, p) => s + p.length, 0) / paths.length) * 10,
          ) / 10,
  };
  await saveToolRun({
    toolId: "utm-attribution",
    label: `${conversions.size} conversions · ${byUser.size} users`,
    input: { lineCount: raw.split("\n").length },
    result: { ok: true, result },
  }).catch(() => undefined);
  return { ok: true, result };
}
