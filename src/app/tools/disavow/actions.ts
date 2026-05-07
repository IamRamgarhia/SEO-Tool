"use server";

const TOXIC_TLDS = [".tk", ".ml", ".ga", ".cf", ".cn", ".ru", ".buzz", ".loan", ".xyz"];
const TOXIC_PATTERNS = [
  /casino|porn|escort|gambling|cialis|viagra|payday|crypto-?airdrop|forex-?signal/i,
  /\bspam(?:link|bot)\b/i,
];

export type DisavowRow = {
  raw: string;
  domain: string | null;
  reason: string;
  toxic: boolean;
};

export type DisavowState =
  | {
      ok: true;
      rows: DisavowRow[];
      output: string;
      stats: { total: number; toxic: number; reviewed: number };
    }
  | { ok: false; error: string };

function hostOf(s: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function detectToxic(host: string, anchor?: string): { toxic: boolean; reason: string } {
  for (const tld of TOXIC_TLDS) {
    if (host.endsWith(tld)) return { toxic: true, reason: `Disposable / spam-prone TLD ${tld}` };
  }
  for (const re of TOXIC_PATTERNS) {
    if (re.test(host)) return { toxic: true, reason: `Spam keyword in domain` };
    if (anchor && re.test(anchor)) return { toxic: true, reason: `Spam anchor text` };
  }
  if (host.length > 40) return { toxic: true, reason: `Suspiciously long domain` };
  if (/^[a-z0-9]{20,}\./i.test(host)) return { toxic: true, reason: `Random-string subdomain` };
  return { toxic: false, reason: "Manual review" };
}

export async function runDisavow(
  _prev: DisavowState | null,
  formData: FormData,
): Promise<DisavowState> {
  const raw = String(formData.get("backlinks") ?? "").trim();
  const mode = String(formData.get("mode") ?? "auto");
  if (!raw) return { ok: false, error: "Paste at least one backlink (URL or domain per line)." };

  const lines = Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  const rows: DisavowRow[] = lines.map((line) => {
    // Format A: "domain.com" or URL only
    // Format B: "domain.com\tanchor text" — TAB-separated
    const parts = line.split(/\t+/);
    const url = parts[0];
    const anchor = parts[1] ?? "";
    const host = hostOf(url);
    if (!host) return { raw: line, domain: null, reason: "Couldn't parse", toxic: false };
    const t = detectToxic(host, anchor);
    return {
      raw: line,
      domain: host,
      reason: t.reason,
      toxic: t.toxic,
    };
  });

  const includeAll = mode === "all";
  const include = rows.filter((r) => r.domain && (includeAll || r.toxic));
  const uniqDomains = Array.from(new Set(include.map((r) => r.domain!).filter(Boolean)));
  const output =
    `# Disavow file generated ${new Date().toISOString().slice(0, 10)}\n` +
    `# ${uniqDomains.length} domain${uniqDomains.length === 1 ? "" : "s"}\n` +
    `# Submit at https://search.google.com/search-console/disavow-links\n\n` +
    uniqDomains.map((d) => `domain:${d}`).join("\n");

  return {
    ok: true,
    rows,
    output,
    stats: {
      total: rows.length,
      toxic: rows.filter((r) => r.toxic).length,
      reviewed: rows.filter((r) => !r.toxic && r.domain).length,
    },
  };
}
