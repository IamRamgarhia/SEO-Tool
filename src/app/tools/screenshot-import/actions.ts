"use server";

import { callAIVision } from "@/lib/ai-vision";

export type ParseResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const PROMPTS: Record<string, string> = {
  rank_table: `You are a data extractor. The image contains a SERP / rank tracker table. Extract every row as CSV with header: keyword,position,volume,change. Use empty string for missing cells. Output ONLY the CSV — no commentary, no markdown fences.`,
  audit_issues: `You are a data extractor. The image contains an SEO audit issues list. Extract every distinct issue as CSV with header: severity,issue,affected_url,count. Output ONLY the CSV.`,
  backlink_table: `You are a data extractor. The image contains a backlinks table. Extract every row as CSV with header: source_domain,source_url,anchor,target_url,da. Output ONLY the CSV.`,
  metric_panel: `You are a data extractor. The image contains a metrics / KPI panel. For each metric, output a row in CSV with header: metric,current,previous,change_pct. Use empty string for missing. Output ONLY the CSV.`,
  content_brief: `You are a data extractor. The image contains a content brief / outline. Extract as markdown with H2/H3 headings exactly as shown, plus any supporting bullets under each heading. No commentary.`,
  general: `You are a data extractor. The image contains a structured table or list. Extract as CSV if it's tabular, or markdown bullets if it's a list. Be faithful to the source. Output ONLY the extracted data — no commentary, no markdown fences.`,
};

export async function parseScreenshot(input: {
  imageDataUrl: string;
  parseType: string;
}): Promise<ParseResult> {
  const match = input.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ok: false, error: "Invalid image data." };
  const [, mime, base64] = match;
  if (!/^image\/(png|jpeg|jpg|gif|webp)$/i.test(mime))
    return { ok: false, error: "Image must be PNG / JPEG / GIF / WebP." };

  const system = PROMPTS[input.parseType] ?? PROMPTS.general;
  const r = await callAIVision({
    system,
    messages: [
      {
        role: "user",
        content: "Extract the structured data from this screenshot.",
        image: { mimeType: mime, base64 },
      },
    ],
    maxTokens: 2500,
    temperature: 0.1,
    feature: "general",
  });
  if (!r) {
    return {
      ok: false,
      error:
        "No vision-capable AI provider responded. Configure OpenAI, Anthropic, Gemini, or OpenRouter in Settings.",
    };
  }
  return { ok: true, text: r.trim() };
}
