/**
 * DNS + RDAP (modern WHOIS replacement) for any hostname. Free, no key.
 *
 * - DNS: Node's dns/promises resolves A/AAAA/MX/NS/TXT/CNAME
 * - RDAP: rdap.org gateway returns structured JSON for nearly every TLD's
 *   registration data. No rate-limit issues for normal use.
 *
 * No external paid service, no API key required.
 */

import dns from "node:dns/promises";

export type DnsCheck = {
  ok: boolean;
  hostname: string;
  a: string[];
  aaaa: string[];
  mx: { exchange: string; priority: number }[];
  ns: string[];
  txt: string[];
  cname: string[];
  spfPresent: boolean;
  dmarcPresent: boolean;
  dmarcValue: string | null;
  caaPresent: boolean;
  /** Free RDAP fields. */
  registrar: string | null;
  created: string | null;
  expires: string | null;
  updated: string | null;
  status: string[];
  daysUntilExpiry: number | null;
  warnings: string[];
  error?: string;
};

export async function checkDns(rawInput: string): Promise<DnsCheck> {
  const hostname = extractHostname(rawInput);
  if (!hostname) {
    return empty(rawInput, "Couldn't parse a hostname.");
  }

  const out: DnsCheck = {
    ok: true,
    hostname,
    a: [],
    aaaa: [],
    mx: [],
    ns: [],
    txt: [],
    cname: [],
    spfPresent: false,
    dmarcPresent: false,
    dmarcValue: null,
    caaPresent: false,
    registrar: null,
    created: null,
    expires: null,
    updated: null,
    status: [],
    daysUntilExpiry: null,
    warnings: [],
  };

  await Promise.all([
    dns.resolve4(hostname).then((rs) => (out.a = rs)).catch(() => {}),
    dns.resolve6(hostname).then((rs) => (out.aaaa = rs)).catch(() => {}),
    dns
      .resolveMx(hostname)
      .then((rs) => (out.mx = rs.sort((a, b) => a.priority - b.priority)))
      .catch(() => {}),
    dns.resolveNs(hostname).then((rs) => (out.ns = rs)).catch(() => {}),
    dns
      .resolveTxt(hostname)
      .then((rs) => (out.txt = rs.map((r) => r.join(""))))
      .catch(() => {}),
    dns.resolveCname(hostname).then((rs) => (out.cname = rs)).catch(() => {}),
    // CAA, DMARC are subdomain queries
    dns
      .resolveTxt(`_dmarc.${hostname}`)
      .then((rs) => {
        const flat = rs.map((r) => r.join("")).join("");
        if (flat) {
          out.dmarcPresent = true;
          out.dmarcValue = flat;
        }
      })
      .catch(() => {}),
    dns
      .resolve(hostname, "CAA")
      .then(() => {
        out.caaPresent = true;
      })
      .catch(() => {}),
  ]);

  out.spfPresent = out.txt.some((t) => /^v=spf1\b/i.test(t));

  // RDAP — registration data
  try {
    const rdap = await fetchRdap(hostname);
    if (rdap) {
      out.registrar = rdap.registrar;
      out.created = rdap.created;
      out.expires = rdap.expires;
      out.updated = rdap.updated;
      out.status = rdap.status;
      if (rdap.expires) {
        const ms = new Date(rdap.expires).getTime() - Date.now();
        out.daysUntilExpiry = Math.round(ms / (24 * 60 * 60 * 1000));
      }
    }
  } catch {
    // ignore — many TLDs have unreliable RDAP
  }

  // Warnings
  if (out.a.length === 0 && out.aaaa.length === 0 && out.cname.length === 0) {
    out.warnings.push("No A/AAAA/CNAME records — domain doesn't resolve.");
  }
  if (out.ns.length === 0) {
    out.warnings.push("No NS records — domain has no nameservers.");
  }
  if (!out.spfPresent && out.mx.length > 0) {
    out.warnings.push("Missing SPF record — outbound mail will be flagged as spam.");
  }
  if (!out.dmarcPresent && out.mx.length > 0) {
    out.warnings.push("Missing DMARC record (_dmarc subdomain). Required by Gmail/Yahoo for senders.");
  }
  if (!out.caaPresent) {
    out.warnings.push(
      "No CAA record — anyone can issue a cert for this domain. Best practice: pin to your CA.",
    );
  }
  if (out.daysUntilExpiry !== null && out.daysUntilExpiry < 30) {
    out.warnings.push(
      `Domain expires in ${out.daysUntilExpiry} days. Renew now — expired domains cost weeks of SEO recovery.`,
    );
  }

  return out;
}

function extractHostname(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  try {
    return new URL(s).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function empty(host: string, error: string): DnsCheck {
  return {
    ok: false,
    hostname: host,
    a: [],
    aaaa: [],
    mx: [],
    ns: [],
    txt: [],
    cname: [],
    spfPresent: false,
    dmarcPresent: false,
    dmarcValue: null,
    caaPresent: false,
    registrar: null,
    created: null,
    expires: null,
    updated: null,
    status: [],
    daysUntilExpiry: null,
    warnings: [],
    error,
  };
}

async function fetchRdap(hostname: string): Promise<{
  registrar: string | null;
  created: string | null;
  expires: string | null;
  updated: string | null;
  status: string[];
} | null> {
  const url = `https://rdap.org/domain/${encodeURIComponent(hostname)}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/rdap+json,application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      events?: { eventAction: string; eventDate: string }[];
      entities?: {
        roles?: string[];
        vcardArray?: unknown;
      }[];
      status?: string[];
    };
    const ev = data.events ?? [];
    const find = (action: string) =>
      ev.find((e) => e.eventAction === action)?.eventDate ?? null;

    let registrar: string | null = null;
    for (const ent of data.entities ?? []) {
      if (ent.roles?.includes("registrar")) {
        const v = ent.vcardArray as unknown as [
          string,
          [string, Record<string, unknown>, string, string][],
        ];
        try {
          const fn = v[1].find((x) => x[0] === "fn");
          if (fn && fn[3]) registrar = fn[3];
        } catch {
          // ignore
        }
      }
    }

    return {
      registrar,
      created: find("registration"),
      expires: find("expiration"),
      updated: find("last changed") ?? find("last update of RDAP database"),
      status: data.status ?? [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
