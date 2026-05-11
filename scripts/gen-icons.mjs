/**
 * Render /public/icon.svg into PNGs (192 + 512) using the already-
 * installed Playwright. Also writes a Windows .ico that's actually a
 * PNG inside an ICO container — Windows accepts this for shortcuts.
 *
 * Run from the project root:
 *   node scripts/gen-icons.mjs
 *
 * Idempotent — overwrites the existing files. setup.ps1/setup.sh call
 * this on first install so users get real icons out of the box.
 */

import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pub = path.join(root, "public");
const svgPath = path.join(pub, "icon.svg");

async function renderSvg(size) {
  const svgText = await fs.readFile(svgPath, "utf-8");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:transparent">
<div style="width:${size}px;height:${size}px">${svgText.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`)}</div>
</body></html>`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(html, { waitUntil: "load" });
  const buf = await page.locator("div").screenshot({ omitBackground: true });
  await browser.close();
  return buf;
}

/**
 * Build a minimal ICO container wrapping a single PNG entry. Windows
 * accepts PNG-in-ICO since Vista. The directory entry's width/height
 * bytes MUST match the embedded PNG's actual dimensions; 0 means 256.
 * Next.js's image loader is strict about this and will reject mismatches.
 */
function pngToIco(pngBuf, size) {
  const dim = size >= 256 ? 0 : size; // 0 = 256 by spec
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // # images
  const entry = Buffer.alloc(16);
  entry.writeUInt8(dim, 0); // width (matches embedded PNG)
  entry.writeUInt8(dim, 1); // height
  entry.writeUInt8(0, 2); // color count (0 = no palette)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits/pixel
  entry.writeUInt32LE(pngBuf.length, 8); // image size
  entry.writeUInt32LE(22, 12); // image offset
  return Buffer.concat([header, entry, pngBuf]);
}

async function main() {
  if (!(await fs.stat(svgPath).catch(() => null))) {
    console.error("public/icon.svg not found — nothing to render.");
    process.exit(1);
  }

  console.log("Rendering icon-192.png…");
  const png192 = await renderSvg(192);
  await fs.writeFile(path.join(pub, "icon-192.png"), png192);

  console.log("Rendering icon-512.png…");
  const png512 = await renderSvg(512);
  await fs.writeFile(path.join(pub, "icon-512.png"), png512);

  console.log("Rendering icon-256.png + packing into icon.ico…");
  const png256 = await renderSvg(256);
  await fs.writeFile(path.join(pub, "icon.ico"), pngToIco(png256, 256));

  console.log("Rendering favicon.ico (32px)…");
  const png32 = await renderSvg(32);
  await fs.writeFile(
    path.join(root, "src", "app", "favicon.ico"),
    pngToIco(png32, 32),
  );

  console.log("\nDone. Icons written to /public + src/app/favicon.ico");
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
