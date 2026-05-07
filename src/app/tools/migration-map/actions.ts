"use server";

import {
  buildMigrationMap,
  renderRedirectMap,
  type MigrationMap,
} from "@/lib/migration-mapper";

export type MigrationState =
  | {
      ok: true;
      map: MigrationMap;
      output: { nginx: string; apache: string; nextjs: string };
    }
  | { ok: false; error: string };

function splitList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 1000);
}

export async function runMapping(
  _prev: MigrationState | null,
  formData: FormData,
): Promise<MigrationState> {
  const oldRaw = String(formData.get("oldUrls") ?? "");
  const newRaw = String(formData.get("newUrls") ?? "");
  const olds = splitList(oldRaw);
  const news = splitList(newRaw);
  if (olds.length === 0)
    return { ok: false, error: "Paste old URLs (one per line)." };
  if (news.length === 0)
    return { ok: false, error: "Paste new URLs (one per line)." };
  try {
    const map = buildMigrationMap({ oldUrls: olds, newUrls: news });
    const output = renderRedirectMap(map);
    return { ok: true, map, output };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Mapping failed" };
  }
}
