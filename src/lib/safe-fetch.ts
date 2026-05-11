/**
 * Defensive fetch + JSON parse for client components. Wraps the common
 * trap where a route returns an HTML error page (404 / 500 from Next's
 * dev shell) and the caller does `await res.json()`, throwing a cryptic
 * "Unexpected token '<', '<!DOCTYPE'…" that bubbles up to users.
 *
 * Always resolves — never rejects. Caller checks `result.ok` and reads
 * `result.data` (parsed JSON) or `result.error` (human-friendly string).
 */

type Ok<T> = { ok: true; status: number; data: T };
type Err = { ok: false; status: number; error: string };
export type SafeFetchResult<T> = Ok<T> | Err;

export async function safeFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<SafeFetchResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error:
        (err as Error).message ||
        "Network error — server may be unreachable.",
    };
  }

  const ct = res.headers.get("content-type") ?? "";
  const isJson = /\bjson\b/i.test(ct);
  const text = await res.text().catch(() => "");

  if (!isJson) {
    // Most common cause: route doesn't exist yet (server still on old
    // bundle), so we got an HTML 404. Don't show the HTML — surface a
    // useful message.
    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        error:
          "That endpoint doesn't exist yet — your server may be on an older bundle. Restart the dev server and try again.",
      };
    }
    return {
      ok: false,
      status: res.status,
      error: `Unexpected non-JSON response from server (status ${res.status}).`,
    };
  }

  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      status: res.status,
      error: "Server returned malformed JSON.",
    };
  }

  if (!res.ok) {
    const errMsg =
      (parsed as { error?: string; message?: string })?.error ??
      (parsed as { error?: string; message?: string })?.message ??
      `Request failed (status ${res.status}).`;
    return { ok: false, status: res.status, error: errMsg };
  }

  return { ok: true, status: res.status, data: parsed as T };
}
