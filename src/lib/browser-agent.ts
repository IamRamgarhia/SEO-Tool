/**
 * Goal-driven browser agent. The user gives:
 *   - A starting URL
 *   - A goal in plain English ("scrape the top 10 listings", "fill the
 *     contact form with my details", "extract every price on the page")
 *
 * We drive headless chromium step-by-step:
 *   1. Take a snapshot of the visible DOM (simplified, just interactable
 *      elements + their selectors + visible text)
 *   2. Ask the LLM "given this page state and the goal, what's the next
 *      action?" — output: navigate / click / type / scroll / extract / done
 *   3. Execute it
 *   4. Repeat until done or step limit hit
 *
 * Each step is logged with reasoning + screenshot so the user can review
 * and stop / resume mid-flow. No paid API needed beyond the AI provider
 * already configured.
 */

import { withBrowserContext } from "./browser-pool";
import { callAI } from "./ai-call";
import type { Page } from "playwright";

export type AgentStep = {
  index: number;
  action: AgentAction;
  reasoning: string;
  result: string;
  screenshot?: string;
  url: string;
};

export type AgentAction =
  | { kind: "navigate"; url: string }
  | { kind: "click"; selector: string }
  | { kind: "type"; selector: string; text: string; submit?: boolean }
  | { kind: "scroll"; pixels: number }
  | { kind: "extract"; description: string; data: unknown }
  | { kind: "done"; summary: string };

export type AgentResult = {
  ok: boolean;
  goal: string;
  startUrl: string;
  steps: AgentStep[];
  finalUrl: string | null;
  extracted: { description: string; data: unknown }[];
  finished: boolean;
  error?: string;
};

const SYSTEM_PROMPT = `You are a careful browser automation agent. Each turn the user gives you the goal, conversation history, and a snapshot of the current page (URL, title, simplified DOM with selectors and visible text).

You must output the SINGLE next action as JSON:

{
  "reasoning": "<one short sentence: why this action>",
  "action": {
    "kind": "<navigate|click|type|scroll|extract|done>",
    ...(args)
  }
}

Args by kind:
- navigate: { "url": "<absolute URL>" }
- click: { "selector": "<CSS selector visible in the snapshot>" }
- type: { "selector": "<input selector>", "text": "<text>", "submit": true|false }
- scroll: { "pixels": <number> }
- extract: { "description": "<what was extracted>", "data": <any JSON> }
- done: { "summary": "<final answer to the goal>" }

Hard rules:
- Use ONLY selectors that appear in the snapshot
- Choose "done" as soon as the goal is satisfied
- Never invent data — only "extract" what's actually on the page
- If the page shows a captcha, log-in wall, or paywall, return done with summary explaining the block
- Output ONLY the JSON object — no commentary, no fences`;

const MAX_STEPS_DEFAULT = 12;
const SNAPSHOT_DOM_BUDGET = 80; // interactable elements

export async function runBrowserAgent(opts: {
  goal: string;
  startUrl: string;
  maxSteps?: number;
  clientId?: number;
  /** Caller can pass a function to interrupt — returns true to abort. */
  shouldStop?: () => boolean;
}): Promise<AgentResult> {
  const maxSteps = Math.min(opts.maxSteps ?? MAX_STEPS_DEFAULT, 25);
  const steps: AgentStep[] = [];
  const extracted: { description: string; data: unknown }[] = [];

  return withBrowserContext(async (context) => {
    const page = await context.newPage();
    try {
      await page.goto(opts.startUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await page.waitForTimeout(800);

      let finished = false;
      for (let i = 0; i < maxSteps; i++) {
        if (opts.shouldStop?.()) {
          return {
            ok: true,
            goal: opts.goal,
            startUrl: opts.startUrl,
            steps,
            finalUrl: page.url(),
            extracted,
            finished: false,
            error: "Stopped by user.",
          };
        }

        const snapshot = await captureSnapshot(page);
        const action = await askForAction({
          goal: opts.goal,
          history: steps,
          snapshot,
          clientId: opts.clientId,
        });
        if (!action) {
          return {
            ok: false,
            goal: opts.goal,
            startUrl: opts.startUrl,
            steps,
            finalUrl: page.url(),
            extracted,
            finished: false,
            error: "AI didn't return a valid action.",
          };
        }

        const before = page.url();
        let result = "";
        try {
          if (action.action.kind === "navigate") {
            await page.goto(action.action.url, {
              waitUntil: "domcontentloaded",
              timeout: 30_000,
            });
            await page.waitForTimeout(800);
            result = `Navigated to ${page.url()}`;
          } else if (action.action.kind === "click") {
            await page.click(action.action.selector, { timeout: 8_000 });
            await page.waitForTimeout(800);
            result = `Clicked ${action.action.selector}`;
          } else if (action.action.kind === "type") {
            await page.fill(action.action.selector, action.action.text, {
              timeout: 8_000,
            });
            if (action.action.submit) {
              await page.press(action.action.selector, "Enter");
              await page.waitForTimeout(1200);
            }
            result = `Typed into ${action.action.selector}`;
          } else if (action.action.kind === "scroll") {
            await page.evaluate(
              (px) => window.scrollBy(0, px),
              action.action.pixels,
            );
            await page.waitForTimeout(400);
            result = `Scrolled ${action.action.pixels}px`;
          } else if (action.action.kind === "extract") {
            extracted.push({
              description: action.action.description,
              data: action.action.data,
            });
            result = `Extracted: ${action.action.description}`;
          } else if (action.action.kind === "done") {
            result = `Done: ${action.action.summary}`;
            finished = true;
          }
        } catch (err) {
          result = `Action failed: ${(err as Error).message}`;
        }

        // Mini screenshot for the step log
        let screenshot: string | undefined;
        try {
          const buf = await page.screenshot({
            type: "jpeg",
            quality: 60,
            fullPage: false,
          });
          screenshot = `data:image/jpeg;base64,${buf.toString("base64")}`;
        } catch {
          screenshot = undefined;
        }

        steps.push({
          index: i,
          action: action.action,
          reasoning: action.reasoning,
          result,
          screenshot,
          url: before,
        });
        if (finished) break;
      }

      return {
        ok: true,
        goal: opts.goal,
        startUrl: opts.startUrl,
        steps,
        finalUrl: page.url(),
        extracted,
        finished,
      };
    } finally {
      await page.close().catch(() => {});
    }
  });
}

type Snapshot = {
  url: string;
  title: string;
  text: string;
  elements: { selector: string; tag: string; label: string }[];
};

async function captureSnapshot(page: Page): Promise<Snapshot> {
  return await page.evaluate((budget) => {
    const url = location.href;
    const title = document.title;

    // Simplified text — first 1500 chars of visible body text
    const text = (document.body.innerText ?? "").slice(0, 1500);

    const elements: { selector: string; tag: string; label: string }[] = [];
    const interactable = Array.from(
      document.querySelectorAll(
        "a[href], button, input, textarea, select, [role='button']",
      ),
    );

    for (const el of interactable) {
      if (elements.length >= budget) break;
      const rect = el.getBoundingClientRect();
      // Skip off-screen / zero-size
      if (rect.width === 0 || rect.height === 0) continue;
      const tag = el.tagName.toLowerCase();
      const label =
        el.getAttribute("aria-label") ??
        el.getAttribute("placeholder") ??
        el.getAttribute("name") ??
        (el as HTMLElement).innerText?.trim().slice(0, 80) ??
        el.getAttribute("value") ??
        "";
      let selector = "";
      const id = el.getAttribute("id");
      if (id) selector = `#${CSS.escape(id)}`;
      else {
        const dataTestid = el.getAttribute("data-testid");
        if (dataTestid) selector = `[data-testid="${dataTestid}"]`;
      }
      if (!selector) {
        // Build a positional selector
        const idx = Array.from(el.parentElement?.children ?? []).indexOf(el);
        const parent = el.parentElement;
        const parentTag = parent?.tagName?.toLowerCase() ?? "body";
        selector = `${parentTag} > ${tag}:nth-child(${idx + 1})`;
      }
      elements.push({ selector, tag, label });
    }

    return { url, title, text, elements };
  }, SNAPSHOT_DOM_BUDGET);
}

async function askForAction(opts: {
  goal: string;
  history: AgentStep[];
  snapshot: Snapshot;
  clientId?: number;
}): Promise<{ reasoning: string; action: AgentAction } | null> {
  const recent = opts.history
    .slice(-6)
    .map(
      (s) =>
        `Step ${s.index} [${s.action.kind}]: ${s.reasoning} → ${s.result.slice(0, 200)}`,
    )
    .join("\n");

  const elementList = opts.snapshot.elements
    .map((e) => `- ${e.tag} | ${e.selector} | ${e.label.slice(0, 80)}`)
    .join("\n");

  const userPrompt = [
    `Goal: ${opts.goal}`,
    "",
    `Current page: ${opts.snapshot.url}`,
    `Title: ${opts.snapshot.title}`,
    `Visible text: ${opts.snapshot.text.slice(0, 1000)}`,
    "",
    `Interactable elements (${opts.snapshot.elements.length}):`,
    elementList || "(none)",
    "",
    `Steps so far:`,
    recent || "(none — this is the first turn)",
    "",
    `Output the next action as JSON.`,
  ].join("\n");

  const raw = await callAI({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 400,
    temperature: 0.2,
    timeoutMs: 30_000,
    feature: "general",
    clientId: opts.clientId ?? null,
    ignoreCreditSaver: true,
  });
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      reasoning?: unknown;
      action?: unknown;
    };
    if (
      typeof parsed.reasoning !== "string" ||
      !parsed.action ||
      typeof parsed.action !== "object"
    ) {
      return null;
    }
    const action = parsed.action as AgentAction;
    if (!["navigate", "click", "type", "scroll", "extract", "done"].includes(action.kind)) {
      return null;
    }
    return { reasoning: parsed.reasoning, action };
  } catch {
    return null;
  }
}
