/**
 * WordPress bridge client. Wraps the REST endpoints exposed by our
 * SEO Tool Bridge plugin (wordpress-plugin/seo-tool-bridge.php).
 *
 * Endpoints (under wp-json/seo-tool/v1/):
 *   GET  /ping                       — health check
 *   GET  /post/{id}/seo              — current title / meta / canonical
 *   POST /post/{id}/seo              — patch title / meta / canonical / robots
 *   POST /attachment/{id}/alt        — set alt text on a media item
 *   POST /post/{id}/schema           — replace inline JSON-LD schema block
 *   GET  /find?url=...               — resolve a public URL to a post ID
 *
 * All calls authenticate with a bearer-style key passed in the
 * `X-STB-Key` header. Per-client creds live on the `clients` table.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { decrypt } from "@/lib/crypto";

export type WpCreds = { endpoint: string; key: string };

export async function getClientWpCreds(
  clientId: number,
): Promise<WpCreds | null> {
  const [c] = await db
    .select({ endpoint: clients.wpEndpoint, key: clients.wpKey })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!c?.endpoint || !c?.key) return null;
  // Decrypt at-rest WP application password (no-op for legacy plaintext rows)
  return { endpoint: c.endpoint.replace(/\/+$/, ""), key: decrypt(c.key) };
}

async function wpFetch<T>(
  creds: WpCreds,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const url = `${creds.endpoint}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "X-STB-Key": creds.key,
        accept: "application/json",
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        status: res.status,
        error: body.slice(0, 300) || res.statusText,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: (err as Error).message ?? "network error",
    };
  }
}

export async function pingWpBridge(creds: WpCreds): Promise<{
  ok: boolean;
  version?: string;
  error?: string;
}> {
  type Resp = { version?: string; ok?: boolean };
  const r = await wpFetch<Resp>(creds, "/ping", { method: "GET" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, version: r.data.version };
}

export type PostSeo = {
  id: number;
  url: string;
  title: string;
  metaDescription: string;
  canonical: string | null;
  robots: string | null;
};

export async function getPostSeo(
  creds: WpCreds,
  postId: number,
): Promise<{ ok: true; seo: PostSeo } | { ok: false; error: string }> {
  const r = await wpFetch<PostSeo>(creds, `/post/${postId}/seo`, { method: "GET" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, seo: r.data };
}

export async function setPostSeo(
  creds: WpCreds,
  postId: number,
  patch: Partial<{
    title: string;
    metaDescription: string;
    canonical: string;
    robots: string;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  const r = await wpFetch<{ ok: boolean }>(
    creds,
    `/post/${postId}/seo`,
    { method: "POST", body: JSON.stringify(patch) },
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

export async function setAttachmentAlt(
  creds: WpCreds,
  attachmentId: number,
  alt: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await wpFetch<{ ok: boolean }>(
    creds,
    `/attachment/${attachmentId}/alt`,
    { method: "POST", body: JSON.stringify({ alt }) },
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

export async function setPostSchema(
  creds: WpCreds,
  postId: number,
  schemaJsonLd: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await wpFetch<{ ok: boolean }>(
    creds,
    `/post/${postId}/schema`,
    { method: "POST", body: JSON.stringify({ jsonLd: schemaJsonLd }) },
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

/**
 * Create a new WordPress post via the plugin. Used by the daily-automation
 * publish step when a blog_draft queue item is approved.
 *
 * Requires plugin v2.0+ which exposes `POST /wp-json/seo-tool/v1/posts`.
 * Older plugin versions return 404 here; caller treats that as "publisher
 * not available" and the queue item stays approved for the user to copy
 * out manually.
 *
 * `status` is "draft" by default — the user reviews in WP admin before
 * publishing. Schedules with auto_publish=true should pass "publish".
 */
export async function createWpPost(
  creds: WpCreds,
  input: {
    title: string;
    content: string;
    excerpt?: string;
    status?: "draft" | "publish";
    schemaJsonLd?: unknown;
    metaDescription?: string;
  },
): Promise<{ ok: true; id: number; url: string } | { ok: false; error: string }> {
  type Resp = { id: number; url: string };
  const r = await wpFetch<Resp>(creds, "/posts", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      excerpt: input.excerpt ?? "",
      status: input.status ?? "draft",
      schemaJsonLd: input.schemaJsonLd ?? null,
      metaDescription: input.metaDescription ?? "",
    }),
  });
  if (!r.ok) {
    return {
      ok: false,
      error:
        r.status === 404
          ? "WordPress plugin needs upgrading (no /posts endpoint). Reinstall the SEO Tool Bridge plugin."
          : r.error,
    };
  }
  return { ok: true, id: r.data.id, url: r.data.url };
}

/**
 * Try to resolve a public URL to a post ID. The plugin's /find endpoint
 * does this; if it 404s we fall back to fetching the URL and parsing the
 * `<link rel="shortlink">` header for `?p=<id>`.
 */
export async function findPostIdByUrl(
  creds: WpCreds,
  url: string,
): Promise<number | null> {
  type Resp = { id?: number };
  const params = new URLSearchParams({ url });
  const r = await wpFetch<Resp>(creds, `/find?${params.toString()}`, {
    method: "GET",
  });
  if (r.ok && typeof r.data.id === "number") return r.data.id;

  // Fallback: scrape the page for the WP "shortlink" with ?p=<id>
  try {
    const res = await fetch(url, {
      headers: { accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);
    const m = html.match(/[?&]p=(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
