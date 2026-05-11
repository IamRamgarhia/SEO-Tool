/**
 * AI image generation for content (blog hero, OG image, illustrative images).
 *
 * BYO key — supports OpenAI's gpt-image-1 / dall-e-3 today, with the same
 * key the user already has in Settings. Returns the generated image as a
 * base64 data URL so the UI can download / copy without server file
 * storage.
 *
 * Why not local Stable Diffusion: requires GPU + model weights + Python.
 * Out of scope for a Node-only self-hosted runtime. Users who want local
 * gen can plug Ollama + a vision/diffusion model and we'll route there
 * once such an open API exists; for now BYO OpenAI key.
 */

import { getApiKey } from "./api-keys";

export type ImageGenInput = {
  prompt: string;
  /** Aspect ratio preset — maps to the right size argument per provider. */
  aspect: "square" | "landscape" | "portrait";
  /** "standard" or "hd" (more detail, more cost). */
  quality?: "standard" | "hd";
  /** Photo / illustration / vector / 3D rendering. */
  style?: "natural" | "vivid";
};

export type ImageGenResult =
  | {
      ok: true;
      /** data:image/png;base64,... ready to drop in an <img src>. */
      dataUrl: string;
      /** Echo of the prompt used (some providers rewrite). */
      revisedPrompt?: string;
      provider: "openai";
      model: string;
      sizeBytes: number;
    }
  | { ok: false; error: string };

const SIZE_MAP: Record<ImageGenInput["aspect"], string> = {
  square: "1024x1024",
  landscape: "1792x1024",
  portrait: "1024x1792",
};

export async function generateImage(
  input: ImageGenInput,
): Promise<ImageGenResult> {
  if (!input.prompt.trim())
    return { ok: false, error: "Prompt is required." };

  const apiKey = await getApiKey("openai");
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Image generation requires an OpenAI API key. Add one in Settings → AI provider, then retry.",
    };
  }

  const size = SIZE_MAP[input.aspect] ?? "1024x1024";
  const quality = input.quality ?? "standard";
  const style = input.style ?? "vivid";
  const model = "dall-e-3";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: input.prompt.slice(0, 4000),
      n: 1,
      size,
      quality,
      style,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      error: `OpenAI error ${res.status}: ${text.slice(0, 400)}`,
    };
  }
  const data = (await res.json()) as {
    data?: { b64_json?: string; revised_prompt?: string }[];
  };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    return { ok: false, error: "No image returned." };
  }

  const sizeBytes = Math.round((b64.length * 3) / 4);
  return {
    ok: true,
    dataUrl: `data:image/png;base64,${b64}`,
    revisedPrompt: data.data?.[0]?.revised_prompt,
    provider: "openai",
    model,
    sizeBytes,
  };
}
