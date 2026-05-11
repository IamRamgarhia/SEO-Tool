"use server";

import { generateImage, type ImageGenInput } from "@/lib/image-gen";
import { saveToolRun } from "@/lib/tool-runs";

export type GenState =
  | {
      ok: true;
      dataUrl: string;
      revisedPrompt?: string;
      sizeBytes: number;
      prompt: string;
    }
  | { ok: false; error: string }
  | null;

export async function runImageGen(
  _prev: GenState,
  formData: FormData,
): Promise<GenState> {
  const prompt = String(formData.get("prompt") ?? "").trim();
  const aspect = (String(formData.get("aspect") ?? "landscape") as
    | "square"
    | "landscape"
    | "portrait");
  const quality = (String(formData.get("quality") ?? "standard") as
    | "standard"
    | "hd");
  const style = (String(formData.get("style") ?? "vivid") as
    | "natural"
    | "vivid");
  if (!prompt) return { ok: false, error: "Prompt is required." };

  const input: ImageGenInput = { prompt, aspect, quality, style };
  const r = await generateImage(input);
  if (!r.ok) return r;

  // Don't store the full base64 in tool_runs — it can be 1MB+. Just metadata.
  await saveToolRun({
    toolId: "image-gen",
    label: `${aspect} · ${prompt.slice(0, 60)}`,
    input: { aspect, quality, style, prompt: prompt.slice(0, 500) },
    result: {
      ok: true,
      sizeBytes: r.sizeBytes,
      revisedPrompt: r.revisedPrompt,
      provider: r.provider,
      model: r.model,
    },
  }).catch(() => undefined);

  return {
    ok: true,
    dataUrl: r.dataUrl,
    revisedPrompt: r.revisedPrompt,
    sizeBytes: r.sizeBytes,
    prompt,
  };
}
