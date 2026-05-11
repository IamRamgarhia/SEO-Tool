/**
 * Update endpoint — checks GitHub for a newer commit on `main` than the
 * one we're running. The frontend Settings page polls this to show
 * "Update available" when there's something new.
 *
 * Triggering the actual update is a separate POST that re-runs the
 * installer script in the background. The user has to wait ~30s for the
 * server to restart on its own port.
 *
 * Read-only by default — POST only when explicitly asked.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { readFileSync } from "node:fs";

const exec = promisify(execFile);

export const dynamic = "force-dynamic";

const REPO = "IamRamgarhia/seo";
const BRANCH = "main";

async function getLocalSha(): Promise<string | null> {
  // Try `git rev-parse HEAD` from repo root. Falls back to reading
  // .git/HEAD if git binary is unavailable (e.g. running from a ZIP).
  try {
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
    });
    return stdout.trim();
  } catch {
    try {
      const head = readFileSync(path.join(process.cwd(), ".git", "HEAD"), "utf-8").trim();
      if (head.startsWith("ref: ")) {
        const ref = head.slice(5);
        const sha = readFileSync(path.join(process.cwd(), ".git", ref), "utf-8").trim();
        return sha;
      }
      return head;
    } catch {
      return null;
    }
  }
}

async function getRemoteSha(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits/${BRANCH}`,
      {
        headers: { accept: "application/vnd.github+json" },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { sha?: string };
    return data.sha ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const [local, remote] = await Promise.all([getLocalSha(), getRemoteSha()]);
  const updateAvailable =
    local !== null && remote !== null && local !== remote;
  return new Response(
    JSON.stringify({
      ok: true,
      local: local?.slice(0, 7) ?? null,
      remote: remote?.slice(0, 7) ?? null,
      updateAvailable,
      // GitHub compare URL so the user can see the changelog
      diffUrl:
        local && remote
          ? `https://github.com/${REPO}/compare/${local.slice(0, 7)}...${remote.slice(0, 7)}`
          : `https://github.com/${REPO}/commits/${BRANCH}`,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

/**
 * POST → trigger the update. Spawns the installer in the background and
 * returns immediately. The user has to wait for the server to come back.
 *
 * Refuses to update if running inside a Docker container where the
 * installer wouldn't work right (mount, image rebuild required).
 */
export async function POST() {
  // Don't run in Docker — installer needs the host's package manager.
  if (process.env.RUNNING_IN_DOCKER === "1") {
    return Response.json(
      {
        ok: false,
        error:
          "Inside Docker — update by running on the host: `cd ~/seo && git pull && docker compose up -d --build`",
      },
      { status: 400 },
    );
  }

  try {
    // Find git on the path
    await exec("git", ["--version"], { cwd: process.cwd() });
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "git not found — re-run the install command from your README to upgrade.",
      },
      { status: 500 },
    );
  }

  // Run git pull synchronously so we can report success/failure clearly.
  try {
    const { stdout, stderr } = await exec("git", ["pull", "--ff-only"], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
    return Response.json({
      ok: true,
      message:
        "Pulled the latest code. Restart the server to apply: stop the process and re-run pnpm dev (or docker compose up -d).",
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
