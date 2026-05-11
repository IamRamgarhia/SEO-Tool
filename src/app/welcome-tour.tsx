import Link from "next/link";
import {
  Bot,
  ClipboardCheck,
  FileText,
  ListChecks,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

const steps = [
  {
    n: 1,
    icon: Bot,
    title: "Connect an AI provider",
    body: "Most tools (audits, content, schema, code generator) need AI. Pick free local Ollama for full privacy, or paste a Groq / Gemini / OpenRouter free-tier key. Anthropic / OpenAI work too.",
    cta: "Set up AI",
    href: "/settings#ai",
    tone: "violet",
  },
  {
    n: 2,
    icon: Users,
    title: "Add your first client",
    body: "Paste a URL — we auto-extract brand name, logo, NAP, social links, and detect their tech stack in 3 seconds. Almost every tool gets way better once you have a client.",
    cta: "Add client",
    href: "/clients/new",
    tone: "cyan",
  },
  {
    n: 3,
    icon: Sparkles,
    title: "Connect Google (GSC + GA4)",
    body: "One OAuth click reveals real ranking + traffic data — no scraping, no API costs. Skip if you only want technical audits.",
    cta: "Set up Google",
    href: "/settings/google",
    tone: "emerald",
  },
  {
    n: 4,
    icon: ClipboardCheck,
    title: "Run an audit",
    body: "30+ checks for indexability, schema, Core Web Vitals, hreflang, security headers, broken links — all locally, no third-party APIs.",
    cta: "See audits",
    href: "/audits",
    tone: "amber",
  },
  {
    n: 5,
    icon: ListChecks,
    title: "Install a task playbook",
    body: "Pre-built routines: weekly health check, monthly content refresh, quarterly review. One click creates every task with staggered due dates.",
    cta: "Browse playbooks",
    href: "/tasks/templates",
    tone: "violet",
  },
  {
    n: 6,
    icon: FileText,
    title: "Generate the first report",
    body: "AI executive summary, white-label branding, PDF or magic-link client portal. Goes from 6 hours/month to 25 minutes/month.",
    cta: "View reports",
    href: "/reports",
    tone: "rose",
  },
  {
    n: 7,
    icon: Workflow,
    title: "Set up automations",
    body: "8 prebuilt templates — rank drops → Slack, page changes → review task, audit failures → alerts. Replaces n8n / Zapier subscriptions.",
    cta: "Browse automations",
    href: "/automations/templates",
    tone: "cyan",
  },
];

const toneCls: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  cyan: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  rose: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export function WelcomeTour() {
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300 ring-1 ring-inset ring-violet-500/30">
            New here
          </span>
          <h2 className="text-xl font-semibold">
            <span className="text-gradient-brand">
              Six steps to replace your $140/mo SEO stack
            </span>
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Each step links to the right place. You can do them in any order, but
          the dashboard fills in real data fastest if you do them top-down.
        </p>
      </header>

      <ol className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="group relative flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${toneCls[s.tone]}`}
              >
                <s.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground ring-1 ring-inset ring-white/10">
                    {s.n}
                  </span>
                  <h3 className="truncate text-sm font-semibold">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
              </div>
            </div>
            <Link
              href={s.href}
              className="mt-3 inline-flex w-fit items-center gap-1 rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-white/10 transition-colors group-hover:bg-white/10 hover:text-foreground"
            >
              {s.cta}
              <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ol>

      <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.02] px-6 py-3 text-xs text-muted-foreground">
        <span>
          Confused by SEO terms?{" "}
          <Link href="/learn" className="text-violet-300 hover:underline">
            Visit the Learn section
          </Link>{" "}
          — every term has a plain-English explanation.
        </span>
      </footer>
    </section>
  );
}
