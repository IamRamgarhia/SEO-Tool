/**
 * Local pack rank heatmap. Generates a NxN grid of geo-points around a
 * city centre, then runs a SERP check at each point using Google's
 * `&uule=` parameter (which encodes "search from this location").
 *
 * Uses the existing rank-checker browser pool. Points spaced ~1.5 km
 * apart by default — covers a 6 km × 6 km area on a 5×5 grid, which
 * matches what most local-SEO tools call "neighbourhood-level" rank.
 */

import { checkRank, type RankCheckResult } from "./rank-checker";

export type GridCell = {
  lat: number;
  lng: number;
  position: number | null;
};

export type GridResult = {
  query: string;
  centerLat: number;
  centerLng: number;
  gridSize: number;
  spacingM: number;
  cells: GridCell[];
  avgPosition: number | null;
  inPackPct: number;
  ranAt: Date;
};

/**
 * Build the lat/lng coordinates for an NxN grid. Latitude conversion is
 * straightforward (1 degree ≈ 111.32 km), longitude depends on latitude
 * (cos(lat) factor).
 */
export function buildGrid(opts: {
  centerLat: number;
  centerLng: number;
  size?: number;
  spacingM?: number;
}): { lat: number; lng: number }[] {
  const size = opts.size ?? 5;
  const spacingM = opts.spacingM ?? 1500;
  const half = (size - 1) / 2;

  const latStepDeg = spacingM / 111_320;
  const lngStepDeg =
    spacingM / (111_320 * Math.cos((opts.centerLat * Math.PI) / 180));

  const out: { lat: number; lng: number }[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      out.push({
        lat: opts.centerLat + (row - half) * latStepDeg,
        lng: opts.centerLng + (col - half) * lngStepDeg,
      });
    }
  }
  return out;
}

/**
 * Run a rank check at every grid cell. We do them serially (with the
 * shared headless browser context) to avoid Google's bot detection
 * triggering on parallel hits.
 *
 * Each cell's rank check is the existing rank-checker invoked with
 * `city = "near <lat>,<lng>"` — Google interprets the substring as a
 * location-anchored query. Cleaner than the full `uule=` encoding and
 * more reliable for browser-mode.
 */
export async function runLocalGrid(opts: {
  query: string;
  domain: string;
  centerLat: number;
  centerLng: number;
  size?: number;
  spacingM?: number;
  country?: string;
  language?: string;
}): Promise<GridResult> {
  const cells = buildGrid({
    centerLat: opts.centerLat,
    centerLng: opts.centerLng,
    size: opts.size,
    spacingM: opts.spacingM,
  });

  const results: GridCell[] = [];
  for (const c of cells) {
    try {
      const r: RankCheckResult = await checkRank(opts.query, opts.domain, {
        country: opts.country,
        language: opts.language,
        city: `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`,
      });
      results.push({ lat: c.lat, lng: c.lng, position: r.position });
    } catch {
      results.push({ lat: c.lat, lng: c.lng, position: null });
    }
  }

  const ranked = results.filter((r) => r.position !== null);
  const avgPosition =
    ranked.length > 0
      ? Math.round(
          ranked.reduce((s, r) => s + (r.position ?? 0), 0) / ranked.length,
        )
      : null;
  const inPack = results.filter(
    (r) => r.position !== null && r.position <= 3,
  ).length;
  const inPackPct = Math.round((inPack / results.length) * 100);

  return {
    query: opts.query,
    centerLat: opts.centerLat,
    centerLng: opts.centerLng,
    gridSize: opts.size ?? 5,
    spacingM: opts.spacingM ?? 1500,
    cells: results,
    avgPosition,
    inPackPct,
    ranAt: new Date(),
  };
}
