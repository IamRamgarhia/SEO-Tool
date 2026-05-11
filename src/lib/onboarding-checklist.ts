/**
 * Onboarding checklist — server-side detector. Each step is derived from
 * real database state, not a "completed" flag the user has to toggle, so
 * progress is always accurate and recovers if the user wipes / restores
 * their data.db.
 *
 * Called from the dashboard. Results live for one request (force-dynamic
 * page) so users see ticks update as they complete each step.
 */

import { db } from "@/db/client";
import { audits, clients, reportArchives } from "@/db/schema";
import { count, eq, ne } from "drizzle-orm";
import { configuredProviders, getActiveProvider } from "./api-keys";
import { getGoogleConnectionStatus } from "./google-oauth";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  cta: string;
  href: string;
};

export async function getOnboardingChecklist(): Promise<{
  steps: ChecklistItem[];
  done: number;
  total: number;
}> {
  // Run all detection queries in parallel
  const [
    activeProvider,
    { ids: providerIds },
    [{ value: clientCount }],
    [{ value: completedAuditCount }],
    [{ value: reportCount }],
    googleStatus,
  ] = await Promise.all([
    getActiveProvider().catch(() => null),
    configuredProviders().catch(() => ({ ids: [] as string[], byId: {} })),
    db.select({ value: count() }).from(clients),
    db
      .select({ value: count() })
      .from(audits)
      .where(eq(audits.status, "completed")),
    db.select({ value: count() }).from(reportArchives),
    getGoogleConnectionStatus().catch(() => ({ connected: false })),
  ]);

  const steps: ChecklistItem[] = [
    {
      id: "ai-provider",
      title: "Connect an AI provider",
      description:
        "Pick free Ollama (private, runs locally) OR paste a free-tier key (Gemini / Groq / DeepSeek / GitHub Models). Unlocks audits, content writer, code generator, AI chat.",
      done: providerIds.length > 0 && activeProvider !== null,
      cta:
        providerIds.length > 0 && activeProvider !== null
          ? "Manage providers"
          : "Set up AI",
      href: "/settings#ai",
    },
    {
      id: "first-client",
      title: "Add your first client",
      description:
        "Paste a domain — we auto-extract brand, logo, NAP, social links, and detect their tech stack in seconds.",
      done: clientCount > 0,
      cta: clientCount > 0 ? "View clients" : "Add client",
      href: clientCount > 0 ? "/clients" : "/clients/new",
    },
    {
      id: "google-oauth",
      title: "Connect Google (GSC + GA4)",
      description:
        "One-click OAuth unlocks real ranking + traffic data. Skip if you only want technical audits — most other tools work without it.",
      done: googleStatus.connected,
      cta: googleStatus.connected ? "Manage" : "Connect Google",
      href: "/settings#google",
    },
    {
      id: "first-audit",
      title: "Run your first audit",
      description:
        "30+ checks for indexability, schema, Core Web Vitals, hreflang, security headers, broken links — local and free.",
      done: completedAuditCount > 0,
      cta: completedAuditCount > 0 ? "View audits" : "Run audit",
      href: "/audits",
    },
    {
      id: "first-report",
      title: "Generate your first report",
      description:
        "AI executive summary + white-label PDF + magic-link client portal. Goes from 6 hours/month to 25 minutes/month.",
      done: reportCount > 0,
      cta: reportCount > 0 ? "View reports" : "Generate report",
      href: "/reports",
    },
  ];

  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length };
}

// Suppress unused warning on ne — kept for future per-status detections.
void ne;
