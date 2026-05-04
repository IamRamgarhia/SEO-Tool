import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { shortLinks } from "@/db/schema";
import { buildDestinationUrl, recordClick } from "@/lib/short-links";

/**
 * GET /r/<slug> — public short-link redirector. Looks up the slug,
 * 302-redirects to the UTM-decorated destination, and records the click
 * for analytics. Returns 404 (HTML page) if the slug doesn't exist.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;

  const [link] = await db
    .select()
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);

  if (!link) {
    return new NextResponse(notFoundHtml(slug), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Fire-and-forget the click record so the redirect feels instant.
  recordClick({
    shortLinkId: link.id,
    userAgent: req.headers.get("user-agent"),
    referer: req.headers.get("referer"),
    acceptLanguage: req.headers.get("accept-language"),
  }).catch(() => {});

  return NextResponse.redirect(buildDestinationUrl(link), 302);
}

function notFoundHtml(slug: string): string {
  const safe = slug.replace(/[<>&"]/g, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Link not found</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:6rem auto;padding:0 1.5rem;text-align:center;color:#333}h1{font-size:1.4rem;margin:0 0 .5rem}p{color:#666}code{background:#f3f3f3;padding:.1rem .35rem;border-radius:3px}</style>
</head>
<body>
<h1>This link doesn&rsquo;t exist</h1>
<p>The slug <code>${safe}</code> isn&rsquo;t a registered short link.</p>
</body>
</html>`;
}
