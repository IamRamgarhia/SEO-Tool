import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server build under .next/standalone — the
  // packaging script copies it into dist/ alongside a bundled Node binary
  // so end-users can run the app by double-clicking, no Node install required.
  output: "standalone",

  // Native modules and ones that load files from disk at runtime must not be
  // bundled by Next — let Node's normal resolution handle them.
  serverExternalPackages: [
    "pdfkit",
    "better-sqlite3",
    "playwright",
    "playwright-core",
    "tesseract.js",
    // Native binding (.node file) inside js-binding.js — Turbopack 16
    // can't place it in an ESM chunk. Leaving as external lets Node's
    // standard require() handle it correctly at runtime.
    "@resvg/resvg-js",
    "satori",
    "qrcode",
  ],

  // Hide the dev-mode "Compiling…" bottom-left indicator. For self-hosters
  // running locally this is visual noise. Removed in production builds
  // automatically; this disables it in dev too.
  devIndicators: false,
};

export default nextConfig;
