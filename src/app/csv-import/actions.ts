"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, keywords, outreachContacts, competitors } from "@/db/schema";
import { fetchSiteMetadata } from "@/lib/site-metadata";

/**
 * Parses a CSV string into rows of objects keyed by header.
 * Handles quoted fields and escaped quotes per RFC 4180. Doesn't try to be
 * Excel — for that the user should re-export as CSV.
 */
function parseCsv(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let i = 0;
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      if (row.some((c) => c.trim().length > 0)) lines.push(row);
      row = [];
      // skip CRLF pair
      if (ch === "\r" && text[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim().length > 0)) lines.push(row);
  }
  if (lines.length === 0) return [];
  const headers = lines[0].map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (cols[j] ?? "").trim();
    }
    return obj;
  });
}

type SchemaKind = "clients" | "keywords" | "outreach" | "competitors" | "unknown";

/** Detects which entity type a CSV maps to from its header columns. */
function detectSchema(rows: Record<string, string>[]): SchemaKind {
  if (rows.length === 0) return "unknown";
  const cols = new Set(Object.keys(rows[0]));
  const has = (...keys: string[]) => keys.some((k) => cols.has(k));

  // Outreach: has email/contact + status, optional url/dr
  if (has("email", "contact", "contact email") && has("status", "stage")) {
    return "outreach";
  }
  // Keywords: has query/keyword, often country/device
  if (has("keyword", "query", "search term", "search query")) {
    return "keywords";
  }
  // Clients: has url/website + name (no per-keyword fields)
  if (
    has("url", "website", "domain", "site") &&
    has("name", "client", "company", "client name")
  ) {
    return "clients";
  }
  // Competitors: has competitor or notes referencing competitors
  if (has("competitor", "competitor url", "competing site")) {
    return "competitors";
  }
  return "unknown";
}

function pick(row: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export type CsvPreview = {
  schema: SchemaKind;
  rowCount: number;
  sample: Record<string, string>[];
  /** Detected headers, lowercased. */
  headers: string[];
};

export async function previewCsv(text: string): Promise<
  | { ok: true; preview: CsvPreview }
  | { ok: false; error: string }
> {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { ok: false, error: "No rows detected. Is this a valid CSV?" };
  }
  const schema = detectSchema(rows);
  return {
    ok: true,
    preview: {
      schema,
      rowCount: rows.length,
      sample: rows.slice(0, 5),
      headers: Object.keys(rows[0]),
    },
  };
}

export type ImportResult = {
  ok: true;
  schema: SchemaKind;
  inserted: number;
  skipped: number;
  errors: string[];
} | {
  ok: false;
  error: string;
};

export async function importCsv(input: {
  text: string;
  schema: SchemaKind;
  clientId?: number;
}): Promise<ImportResult> {
  const rows = parseCsv(input.text);
  if (rows.length === 0) {
    return { ok: false, error: "No rows" };
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  if (input.schema === "clients") {
    for (const r of rows) {
      const url = pick(r, "url", "website", "domain", "site");
      const name = pick(r, "name", "client", "company", "client name");
      if (!url) {
        skipped++;
        continue;
      }
      try {
        const meta = await fetchSiteMetadata(url);
        await db.insert(clients).values({
          name: name ?? meta.name ?? new URL(meta.url).hostname,
          url: meta.url,
          logoUrl: meta.logoUrl,
          description: meta.description,
          niche: pick(r, "niche", "industry") as
            | "local"
            | "ecommerce"
            | "saas"
            | "blog"
            | "services"
            | null,
        });
        inserted++;
      } catch (e) {
        skipped++;
        errors.push(
          `${url}: ${e instanceof Error ? e.message : "insert failed"}`,
        );
      }
    }
    revalidatePath("/clients");
  } else if (input.schema === "keywords") {
    if (!input.clientId) {
      return { ok: false, error: "Pick a client for keyword import." };
    }
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1);
    if (!client) return { ok: false, error: "Client not found" };

    for (const r of rows) {
      const query = pick(r, "keyword", "query", "search term", "search query");
      if (!query) {
        skipped++;
        continue;
      }
      try {
        await db.insert(keywords).values({
          clientId: input.clientId,
          query,
          country: pick(r, "country", "geo") ?? "US",
          device: (pick(r, "device") ?? "desktop") as "desktop" | "mobile",
        });
        inserted++;
      } catch (e) {
        skipped++;
        errors.push(
          `${query}: ${e instanceof Error ? e.message : "insert failed"}`,
        );
      }
    }
    revalidatePath("/keywords");
  } else if (input.schema === "outreach") {
    if (!input.clientId) {
      return { ok: false, error: "Pick a client for outreach import." };
    }
    for (const r of rows) {
      const url =
        pick(r, "url", "website", "domain", "target url") ?? null;
      const email = pick(r, "email", "contact email", "contact");
      const name = pick(r, "name", "contact name", "person") ?? "";
      const status = (pick(r, "status", "stage") ?? "prospect") as
        | "prospect"
        | "contacted"
        | "replied"
        | "won"
        | "lost";
      if (!email && !url) {
        skipped++;
        continue;
      }
      try {
        await db.insert(outreachContacts).values({
          clientId: input.clientId,
          name: name || (email ?? url ?? "Contact"),
          email: email ?? null,
          website: url,
          status,
          notes: pick(r, "notes", "comment"),
        });
        inserted++;
      } catch (e) {
        skipped++;
        errors.push(
          `${email ?? url}: ${e instanceof Error ? e.message : "insert failed"}`,
        );
      }
    }
    revalidatePath("/outreach");
  } else if (input.schema === "competitors") {
    if (!input.clientId) {
      return { ok: false, error: "Pick a client for competitor import." };
    }
    for (const r of rows) {
      const url = pick(r, "competitor url", "url", "domain", "competitor");
      const name =
        pick(r, "competitor name", "name", "company") ??
        (url ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname : "");
      if (!url) {
        skipped++;
        continue;
      }
      try {
        await db.insert(competitors).values({
          clientId: input.clientId,
          name,
          url: url.startsWith("http") ? url : `https://${url}`,
          notes: pick(r, "notes"),
        });
        inserted++;
      } catch (e) {
        skipped++;
        errors.push(
          `${url}: ${e instanceof Error ? e.message : "insert failed"}`,
        );
      }
    }
    revalidatePath("/competitors");
  } else {
    return {
      ok: false,
      error:
        "Couldn't detect what this CSV is. Pick a schema manually or rename headers.",
    };
  }

  return {
    ok: true,
    schema: input.schema,
    inserted,
    skipped,
    errors: errors.slice(0, 5),
  };
}
