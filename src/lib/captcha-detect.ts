/**
 * Shared captcha / consent / "unusual traffic" detector. Used by every
 * Google-facing scraper so users see a consistent reason why a scrape
 * came back empty (rather than "no results found", which is misleading).
 *
 * Patterns cover: Google's unusual-traffic page, the EU consent page,
 * Cloudflare challenge, hCaptcha/reCAPTCHA mounts, "verify you're human".
 */

export type CaptchaResult = {
  blocked: boolean;
  /** Best guess at the reason — surfaced to the user. */
  reason:
    | "google_unusual_traffic"
    | "google_consent"
    | "cloudflare_challenge"
    | "recaptcha"
    | "hcaptcha"
    | "generic_captcha"
    | "rate_limit"
    | null;
};

const PATTERNS: { reason: CaptchaResult["reason"]; re: RegExp }[] = [
  {
    reason: "google_unusual_traffic",
    re: /unusual traffic from your computer network/i,
  },
  {
    reason: "google_consent",
    re: /before you continue to google search|please enable cookies|accept-cookies-button/i,
  },
  {
    reason: "cloudflare_challenge",
    re: /cf-browser-verification|attention required.*cloudflare|checking your browser before/i,
  },
  { reason: "recaptcha", re: /www\.google\.com\/recaptcha\/api\.js|g-recaptcha/i },
  { reason: "hcaptcha", re: /hcaptcha\.com\/captcha|h-captcha/i },
  { reason: "generic_captcha", re: /verify (you'?re|that you are) (a )?human|i'?m not a robot/i },
  {
    reason: "rate_limit",
    re: /\b(429|too many requests|rate ?limit)\b/i,
  },
];

export function detectCaptcha(html: string): CaptchaResult {
  if (!html) return { blocked: false, reason: null };
  // Only inspect the first 8 KB — captcha banners are always near the top.
  const sample = html.slice(0, 8_000);
  for (const p of PATTERNS) {
    if (p.re.test(sample)) {
      return { blocked: true, reason: p.reason };
    }
  }
  return { blocked: false, reason: null };
}

export function captchaUserMessage(reason: CaptchaResult["reason"]): string {
  switch (reason) {
    case "google_unusual_traffic":
      return "Google blocked the scan — too many recent requests from this IP. Add a proxy in Settings → Headless browser pool, or wait an hour and retry.";
    case "google_consent":
      return "Google's EU consent page intercepted the request. Add a proxy in a non-EU country, or add a cookie store entry that pre-accepts the consent.";
    case "cloudflare_challenge":
      return "Cloudflare challenge page intercepted the request. The site uses bot protection — try with stealth mode ON and proxies that aren't already flagged.";
    case "recaptcha":
      return "Page gated behind reCAPTCHA. Headless browsers can't solve these — needs a different proxy or a logged-in cookie session.";
    case "hcaptcha":
      return "Page gated behind hCaptcha. Headless browsers can't solve these.";
    case "rate_limit":
      return "The target rate-limited this request (429). Lower max concurrency in Settings, add a proxy pool, or back off and retry.";
    case "generic_captcha":
      return "A captcha intercepted the page. Try a different proxy or a logged-in cookie.";
    default:
      return "Page returned blank or non-content. Check the URL and retry.";
  }
}
