/**
 * Curated Google algorithm-update timeline used by the traffic-drop
 * diagnostic to correlate drops with rollouts.
 *
 * Stays in sync (manually) with the /algorithm-updates page's CURATED list.
 * If a drop overlaps the rollout window of any of these, that's the most
 * likely culprit — at least more likely than internal site changes.
 */

export type AlgoUpdate = {
  date: string; // YYYY-MM-DD start
  endDate?: string; // YYYY-MM-DD end (rollout completes)
  name: string;
  type:
    | "core"
    | "spam"
    | "helpful_content"
    | "product_review"
    | "ai"
    | "other";
  summary: string;
};

export const ALGO_UPDATES: AlgoUpdate[] = [
  {
    date: "2025-12-04",
    endDate: "2025-12-19",
    name: "December 2025 Core Update",
    type: "core",
    summary: "Routine core update — typical 2-3 week rollout, broad ranking shifts.",
  },
  {
    date: "2025-09-08",
    endDate: "2025-09-22",
    name: "September 2025 Core Update",
    type: "core",
    summary:
      "Significant shifts on commercial queries; many sites that gained from earlier helpful-content adjustments saw partial recovery.",
  },
  {
    date: "2025-06-30",
    endDate: "2025-07-17",
    name: "June 2025 Core Update",
    type: "core",
    summary: "Core update with broader weighting toward original content.",
  },
  {
    date: "2025-03-13",
    endDate: "2025-03-27",
    name: "March 2025 Core Update",
    type: "core",
    summary: "Targeted thin / unhelpful content; many AI-generated sites took hits.",
  },
  {
    date: "2024-11-11",
    endDate: "2024-12-05",
    name: "November 2024 Core Update",
    type: "core",
    summary: "Broad core update with publisher-tier shifts.",
  },
  {
    date: "2024-08-15",
    endDate: "2024-09-03",
    name: "August 2024 Core Update",
    type: "core",
    summary: "Reversed some Helpful Content System over-corrections.",
  },
  {
    date: "2024-03-05",
    endDate: "2024-04-19",
    name: "March 2024 Core + Spam Updates",
    type: "core",
    summary:
      "Largest spam crackdown in years — site-wide manual actions for AI-generated, scaled-content, expired-domain abuse.",
  },
];

/**
 * Find updates that overlap a given date range. A drop on date D is "near"
 * an update if the update window contains D or starts/ends within ±3 days.
 */
export function updatesNearRange(
  startISO: string,
  endISO: string,
): AlgoUpdate[] {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const windowMs = 3 * 24 * 60 * 60 * 1000;
  const out: AlgoUpdate[] = [];
  for (const u of ALGO_UPDATES) {
    const us = new Date(u.date).getTime();
    const ue = new Date(u.endDate ?? u.date).getTime();
    // Overlap with ±3 day buffer
    if (us - windowMs <= end && ue + windowMs >= start) {
      out.push(u);
    }
  }
  return out;
}
