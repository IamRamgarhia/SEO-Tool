"use client";

type Cell = { lat: number; lng: number; position: number | null };

/**
 * Render the grid as a square SVG heatmap. Position 1-3 = green (in pack),
 * 4-10 = amber (page 1), 11-20 = orange, 21+ = red, null = grey.
 */
export function Heatmap({
  cells,
  size,
}: {
  cells: Cell[];
  size: number;
}) {
  if (cells.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No cells to display.</p>
    );
  }

  // The cells are emitted row-major from buildGrid. Render north (row 0)
  // at the bottom so the heatmap reads like a map.
  const rows: Cell[][] = [];
  for (let r = 0; r < size; r++) {
    rows.unshift(cells.slice(r * size, (r + 1) * size));
  }

  const tile = 64;
  const gap = 6;
  const total = tile * size + gap * (size - 1);

  return (
    <div className="space-y-3">
      <div
        style={{ width: total, height: total }}
        className="relative mx-auto"
      >
        {rows.flatMap((row, rIdx) =>
          row.map((cell, cIdx) => {
            const x = cIdx * (tile + gap);
            const y = rIdx * (tile + gap);
            const tone = positionTone(cell.position);
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                title={`(${cell.lat.toFixed(4)}, ${cell.lng.toFixed(4)}) — ${cell.position ?? "not ranked"}`}
                style={{ left: x, top: y, width: tile, height: tile }}
                className={`absolute grid place-items-center rounded-md text-xs font-bold tabular-nums ring-1 ring-inset ${tone}`}
              >
                {cell.position ?? "—"}
              </div>
            );
          }),
        )}
      </div>
      <Legend />
    </div>
  );
}

function positionTone(p: number | null): string {
  if (p === null) return "bg-white/5 text-muted-foreground ring-white/10";
  if (p <= 3) return "bg-emerald-500/40 text-emerald-100 ring-emerald-400/60";
  if (p <= 10) return "bg-amber-500/30 text-amber-100 ring-amber-400/50";
  if (p <= 20) return "bg-orange-500/30 text-orange-100 ring-orange-400/50";
  return "bg-rose-500/25 text-rose-100 ring-rose-400/40";
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
      <LegendDot tone="bg-emerald-500/40 ring-emerald-400/60" label="1-3 (in pack)" />
      <LegendDot tone="bg-amber-500/30 ring-amber-400/50" label="4-10" />
      <LegendDot tone="bg-orange-500/30 ring-orange-400/50" label="11-20" />
      <LegendDot tone="bg-rose-500/25 ring-rose-400/40" label="21+" />
      <LegendDot tone="bg-white/5 ring-white/10" label="Not ranked" />
    </div>
  );
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ring-1 ring-inset ${tone}`} />
      <span>{label}</span>
    </span>
  );
}
