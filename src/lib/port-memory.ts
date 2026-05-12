/**
 * Tiny single-file port memory. Persists the port the server is
 * currently bound to so the launcher (seo.cmd / desktop shortcut /
 * restart) can come back up on that exact port — no surprise tab
 * switches for the user.
 *
 * Lives at `<cwd>/.seo-port` so seo.cmd can read it as plain text.
 * Always best-effort: errors are swallowed. The file is gitignored.
 */

import { promises as fs } from "node:fs";
import { dataFile } from "./data-dir";

const FILE = dataFile(".seo-port");

export async function rememberPort(port: string | number): Promise<void> {
  const p = String(port).trim();
  if (!/^\d+$/.test(p)) return;
  try {
    await fs.writeFile(FILE, p, "utf-8");
  } catch {
    // ignore — file system might be read-only in some hosts
  }
}

export async function getRememberedPort(): Promise<string | null> {
  try {
    const txt = (await fs.readFile(FILE, "utf-8")).trim();
    return /^\d+$/.test(txt) ? txt : null;
  } catch {
    return null;
  }
}

export function detectPortFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-port");
  if (fwd && /^\d+$/.test(fwd)) return fwd;
  const host = req.headers.get("host") ?? "";
  const m = host.match(/:(\d+)\s*$/);
  if (m) return m[1];
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return proto === "https" ? "443" : "80";
}
