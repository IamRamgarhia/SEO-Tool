import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/secure-compare";

/**
 * Optional password gate. Activates ONLY when APP_PASSWORD env var is set.
 * Local development with no env var → no auth (current behavior preserved).
 *
 * On a request without a valid cookie, redirects to /login (or returns 401
 * for API + RSC requests). Once the user submits the right password the
 * /api/auth/login route sets a 30-day cookie.
 */

const COOKIE_NAME = "stb_auth";
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
  // Short-link redirector — must be public so external visitors clicking
  // the link reach the destination without hitting the auth gate.
  "/r",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const required = process.env.APP_PASSWORD;
  // No password set → no auth required (single-user local mode)
  if (!required) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value) {
    const expected = await expectedToken(required);
    if (timingSafeEqual(cookie.value, expected)) {
      return NextResponse.next();
    }
  }

  // Browser-style request → redirect to /login
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Token = SHA-256(APP_PASSWORD + ".v1") expressed as 64-char hex.
 *
 * The cookie value is the HASH, never the raw password. If the cookie
 * ever leaks (XSS, network sniff, dumped logs), the attacker has to
 * crack a SHA-256 to recover APP_PASSWORD — not a free read.
 *
 * Edge runtime: crypto.subtle.digest is async, hence this helper is
 * async. Middleware now awaits it; the login route does the same.
 */
export async function expectedToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}.v1`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const config = {
  matcher: [
    /*
     * Run on every path EXCEPT:
     *  - /_next/static (static assets)
     *  - /_next/image (image optimization)
     *  - any file with an extension (.png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
