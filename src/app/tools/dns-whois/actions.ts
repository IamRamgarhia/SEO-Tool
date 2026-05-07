"use server";

import { checkDns, type DnsCheck } from "@/lib/dns-rdap";

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
  return { ok: true, result: r };
}
