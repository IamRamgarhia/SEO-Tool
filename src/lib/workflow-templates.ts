/**
 * Prebuilt automation workflow templates. Each maps to an existing
 * (trigger, action) pair in the automations table — no schema changes needed.
 *
 * Triggers supported: audit_completed | audit_failed | score_drop |
 * page_change | rank_drop. Actions supported: webhook | create_task | log.
 */

export type WorkflowAction =
  | { kind: "webhook" }
  | {
      kind: "create_task";
      title: string;
      priority: "high" | "medium" | "low";
    }
  | { kind: "log"; message: string };

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: "alerts" | "tasks" | "logs";
  trigger:
    | "audit_completed"
    | "audit_failed"
    | "score_drop"
    | "page_change"
    | "rank_drop";
  action: WorkflowAction;
  /** ★ for the highest-impact ones surface them visually. */
  recommended?: boolean;
};

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "rank-drop-slack",
    name: "Rank drop → Slack alert",
    description:
      "When any tracked keyword falls 5+ positions, post to your team's Slack channel so you can investigate before the client notices.",
    category: "alerts",
    trigger: "rank_drop",
    action: { kind: "webhook" },
    recommended: true,
  },
  {
    id: "rank-drop-task",
    name: "Rank drop → triage task",
    description:
      "Auto-create a high-priority task whenever a keyword drops out of the top 10. Catches losses while they're still recoverable.",
    category: "tasks",
    trigger: "rank_drop",
    action: {
      kind: "create_task",
      title: "Investigate ranking drop",
      priority: "high",
    },
    recommended: true,
  },
  {
    id: "page-change-slack",
    name: "Page change → Slack alert",
    description:
      "Tracked page's title, meta, H1, or canonical changed — usually a teammate edit you didn't authorize. Get the diff in Slack within minutes.",
    category: "alerts",
    trigger: "page_change",
    action: { kind: "webhook" },
    recommended: true,
  },
  {
    id: "score-drop-task",
    name: "Audit score drops → recovery task",
    description:
      "Audit score regresses vs the prior run. Creates a task to triage what changed before it compounds.",
    category: "tasks",
    trigger: "score_drop",
    action: {
      kind: "create_task",
      title: "Audit score regressed — investigate root cause",
      priority: "high",
    },
    recommended: true,
  },
  {
    id: "audit-completed-log",
    name: "Audit finished → activity log",
    description:
      "Log every successful audit completion to the activity feed so monthly reports auto-populate the work-done section.",
    category: "logs",
    trigger: "audit_completed",
    action: {
      kind: "log",
      message: "Audit completed — results ready for review",
    },
  },
  {
    id: "audit-failed-slack",
    name: "Audit failed → Slack alert",
    description:
      "Audit crashed (site down, robots blocked, timeout). Get notified immediately instead of finding out at the next monthly report.",
    category: "alerts",
    trigger: "audit_failed",
    action: { kind: "webhook" },
  },
  {
    id: "page-change-task",
    name: "Page change → review task",
    description:
      "Auto-create a medium-priority task to review unauthorized title/meta edits on tracked pages.",
    category: "tasks",
    trigger: "page_change",
    action: {
      kind: "create_task",
      title: "Review unauthorized page edit",
      priority: "medium",
    },
  },
  {
    id: "score-drop-slack",
    name: "Audit score drop → Slack",
    description:
      "Score regression on any client lights up Slack — perfect for agency owners watching multiple sites at once.",
    category: "alerts",
    trigger: "score_drop",
    action: { kind: "webhook" },
  },
];

export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
