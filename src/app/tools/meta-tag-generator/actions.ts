"use server";

import { callAI } from "@/lib/ai-call";
import { saveToolRun } from "@/lib/tool-runs";

export type MetaTagOption = {
  title: string;
  description: string;
  rationale: string;
};

export type MetaTagState =
  | {
      ok: true;
      pageTopic: string;
      options: MetaTagOption[];
      socialPreview: { ogTitle: string; ogDescription: string };
    }
  | { ok: false; error: string }
  | null;

const SYSTEM = `You generate optimized HTML meta tags for SEO + click-through rate.

Rules:
- Output STRICT JSON, no markdown fences.
- 3 options total. Each title 45-60 chars. Each description 140-160 chars.
- Options should vary in angle: one keyword-led, one benefit-led, one curiosity-led.
- "rationale" explains WHY this works for the topic — 1 sentence.
- "ogTitle" can be slightly longer (up to 90 chars) — for social shares.
- "ogDescription" up to 200 chars.
- Never invent claims. Stick to what the user told you.

Output:
{
  "options": [{"title":"...","description":"...","rationale":"..."}, ...],
  "socialPreview": {"ogTitle":"...","ogDescription":"..."}
}`;

export async function generateMetaTags(
  _prev: MetaTagState | null,
  formData: FormData,
): Promise<MetaTagState> {
  const topic = String(formData.get("topic") ?? "").trim();
  const keyword = String(formData.get("keyword") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const intent = String(formData.get("intent") ?? "informational").trim();
  const audience = String(formData.get("audience") ?? "").trim();

  if (!topic) return { ok: false, error: "Page topic required." };

  const user = `Generate 3 meta tag options.

Page topic: ${topic}
${keyword ? `Primary keyword: ${keyword}` : ""}
${brand ? `Brand name: ${brand}` : ""}
Search intent: ${intent}
${audience ? `Target audience: ${audience}` : ""}

Constraints:
- Titles 45-60 chars
- Descriptions 140-160 chars
- Vary the angle across the 3 options
- Each rationale = 1 sentence

Return JSON only.`;

  const raw = await callAI({
    system: SYSTEM,
    user,
    maxTokens: 1200,
    temperature: 0.6,
    feature: "meta_rewrite",
    ignoreCreditSaver: true,
  });

  if (!raw) {
    return {
      ok: false,
      error: "AI provider not configured. Add an API key in Settings → AI.",
    };
  }

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: {
    options?: MetaTagOption[];
    socialPreview?: { ogTitle: string; ogDescription: string };
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "Couldn't parse AI response — try again." };
  }

  if (!parsed.options || parsed.options.length === 0) {
    return { ok: false, error: "AI returned no options. Try again." };
  }

  const result: MetaTagState = {
    ok: true,
    pageTopic: topic,
    options: parsed.options,
    socialPreview:
      parsed.socialPreview ?? {
        ogTitle: parsed.options[0].title,
        ogDescription: parsed.options[0].description,
      },
  };

  await saveToolRun({
    toolId: "meta-tag-generator",
    label: `${topic.slice(0, 60)} · ${parsed.options.length} options`,
    input: { topic, keyword, brand, intent, audience },
    result,
  }).catch(() => undefined);

  return result;
}
