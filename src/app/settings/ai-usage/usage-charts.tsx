"use client";

/**
 * Tremor-powered visualizations on the AI usage page. Server component
 * computes the aggregations and hands serialized data here so this
 * client island just renders. Both charts get:
 *   - Themed cyan/violet/amber/emerald accents matching the new palette
 *   - Plain-English value formatters (calls + USD)
 *   - Sensible empty states
 */

import { BarChart, DonutChart, Legend } from "@tremor/react";
import { Activity, PieChart } from "lucide-react";

type DailyPoint = {
  day: string;
  calls: number;
  cost: number;
};

type FeatureRow = {
  feature: string;
  calls: number;
  cost: number;
  tokens: number;
};

export function UsageCharts({
  days,
  featureRows,
}: {
  days: DailyPoint[];
  featureRows: FeatureRow[];
}) {
  // Donut wants whole-dollar values (cost is in micros — divide once)
  const featureChart = featureRows
    .filter((r) => r.cost > 0)
    .slice(0, 8)
    .map((r) => ({
      name: r.feature,
      cost: r.cost / 1_000_000,
      calls: r.calls,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Daily calls — 2/3 width */}
      <section className="rounded-xl border border-border bg-card p-5 shadow lg:col-span-2">
        <header className="mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="size-4 text-[oklch(0.74_0.18_215)]" />
            Last 30 days · calls per day
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hover bars for daily totals + estimated cost.
          </p>
        </header>
        <BarChart
          data={days}
          index="day"
          categories={["calls"]}
          colors={["cyan"]}
          showLegend={false}
          showGridLines={false}
          yAxisWidth={32}
          className="h-52"
          valueFormatter={(v) => `${v.toLocaleString()}`}
        />
      </section>

      {/* Per-feature donut — 1/3 width */}
      <section className="rounded-xl border border-border bg-card p-5 shadow">
        <header className="mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <PieChart className="size-4 text-[oklch(0.68_0.16_295)]" />
            Cost by feature
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last 30 days. Top 8 features by spend.
          </p>
        </header>
        {featureChart.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">
            No cost data yet
          </div>
        ) : (
          <>
            <DonutChart
              data={featureChart}
              category="cost"
              index="name"
              colors={["cyan", "violet", "amber", "emerald", "rose", "indigo", "pink", "sky"]}
              valueFormatter={(v) => `$${v.toFixed(3)}`}
              className="h-44"
            />
            <Legend
              categories={featureChart.map((f) => f.name)}
              colors={["cyan", "violet", "amber", "emerald", "rose", "indigo", "pink", "sky"]}
              className="mt-3 justify-center"
            />
          </>
        )}
      </section>
    </div>
  );
}
