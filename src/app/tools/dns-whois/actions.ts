"use server";

import { checkDns, type DnsCheck } from "@/lib/dns-rdap";
import { saveToolRun } from "@/lib/tool-runs";

export type DnsState =
  | { ok: true; result: DnsCheck }
  | { ok: false; error: string };

export async function runDns(
  _prev: DnsState | null,
  formData: FormData,
): Promise<DnsState> {
  const raw = String(formData.get("host") ?? "").trim();
  if (!raw) return { ok: false, error: "Enter a domain or URL." };
  const r = await checkDns(raw);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "dns-whois",
    label: raw,
    input: { host: raw },
    result: { ok: true, result: r },
  }).catch(() => undefined);
  return { ok: true, result: r };
}
