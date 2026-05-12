/**
 * Optional Inter-font upgrade for PDF reports.
 *
 * PDFKit ships with the 14 standard PDF fonts (Helvetica, Times, Courier
 * etc.) which work everywhere with no setup. Reports default to those.
 *
 * If the user drops Inter TTF files into `src/lib/fonts/`, this module
 * loads them once into memory and `registerInterFonts(doc)` registers
 * them on each new PDFDocument under the names "Body" / "BodyBold" /
 * "BodyItalic". The report-generator then prefers `pickFont(...)` over
 * raw font names so it transparently uses Inter when present and falls
 * back to Helvetica otherwise.
 *
 * To enable Inter:
 *   1. Download Inter-Regular.ttf, Inter-Bold.ttf, Inter-Italic.ttf
 *      from https://rsms.me/inter/ (SIL OFL 1.1 — bundleable)
 *   2. Place them in `src/lib/fonts/`
 *   3. Restart the server. Future reports use Inter.
 *
 * No code change required; this loader detects the files at startup.
 */

import fs from "node:fs";
import path from "node:path";

type LoadedFonts = {
  regular: Buffer;
  bold: Buffer;
  italic: Buffer | null;
};

let cached: LoadedFonts | null | undefined;

/**
 * Read Inter TTFs from disk once. Returns null when files aren't there
 * — that's the normal default state and not an error. Returns the
 * Buffer triple when all three are present.
 */
function loadInter(): LoadedFonts | null {
  if (cached !== undefined) return cached;

  const dir = path.join(process.cwd(), "src", "lib", "fonts");
  const regularPath = path.join(dir, "Inter-Regular.ttf");
  const boldPath = path.join(dir, "Inter-Bold.ttf");
  const italicPath = path.join(dir, "Inter-Italic.ttf");

  try {
    if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
      cached = null;
      return null;
    }
    cached = {
      regular: fs.readFileSync(regularPath),
      bold: fs.readFileSync(boldPath),
      italic: fs.existsSync(italicPath) ? fs.readFileSync(italicPath) : null,
    };
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

/**
 * Register Inter on this PDFDocument if the TTFs are available. We
 * register under the Helvetica family names ("Helvetica",
 * "Helvetica-Bold", "Helvetica-Oblique") so every existing
 * `doc.font("Helvetica...")` call site in report-generator.ts
 * automatically picks up Inter without code change. PDFKit consults
 * registeredFonts before its built-in standard fonts, so the override
 * is transparent.
 *
 * Idempotent per document — safe to call once at doc init.
 * Returns true if Inter is now active.
 */
export function registerInterFonts(doc: PDFKit.PDFDocument): boolean {
  const fonts = loadInter();
  if (!fonts) return false;
  doc.registerFont("Helvetica", fonts.regular);
  doc.registerFont("Helvetica-Bold", fonts.bold);
  if (fonts.italic) {
    doc.registerFont("Helvetica-Oblique", fonts.italic);
  }
  // Also register under stable explicit names for new code that prefers
  // semantic font references over the legacy Helvetica family.
  doc.registerFont("Body", fonts.regular);
  doc.registerFont("BodyBold", fonts.bold);
  if (fonts.italic) doc.registerFont("BodyItalic", fonts.italic);
  return true;
}

/**
 * Returns the right font name based on whether Inter is loaded:
 *   pickFont(true, "regular") → "Body" if Inter, else "Helvetica"
 *   pickFont(true, "bold")    → "BodyBold" if Inter, else "Helvetica-Bold"
 *   pickFont(true, "italic")  → "BodyItalic" if Inter, else "Helvetica-Oblique"
 *
 * Callers should resolve the bool once at doc-init time and pass it
 * down rather than re-checking per font call.
 */
export function pickFont(
  hasInter: boolean,
  style: "regular" | "bold" | "italic",
): string {
  if (hasInter) {
    if (style === "regular") return "Body";
    if (style === "bold") return "BodyBold";
    return "BodyItalic";
  }
  if (style === "regular") return "Helvetica";
  if (style === "bold") return "Helvetica-Bold";
  return "Helvetica-Oblique";
}
