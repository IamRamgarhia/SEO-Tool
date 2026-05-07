import { getActiveProvider, getApiKey, getOllamaUrl } from "./api-keys";
import { getSetting } from "./settings-store";
import { checkMonthlyCap, logAiCall } from "./ai-usage";

export type AiFeatureName =
  | "exec_summary"
  | "blog_draft"
  | "title_rewrite"
  | "meta_rewrite"
  | "review_reply"
  | "content_idea"
  | "general";

export type AiCallOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Per-call timeout in ms. Defaults to 60s — blog writing can be slow. */
  timeoutMs?: number;
  /**
   * Bypass credit-saver mode. Use only for features where terse output is
   * useless (e.g. full blog drafts that need to be long by definition).
   */
  ignoreCreditSaver?: boolean;
  /**
   * Tags this call so the feedback-learning module can inject learned
   * style rules into the system prompt. Optional but recommended for
   * any user-facing feature that takes corrections.
   */
  feature?: AiFeatureName;
  /** Scopes learned rules to this client when set. */
  clientId?: number | null;
};

/**
 * Calls whichever AI provider the user has set as active. Returns the text
 * response, or null on any failure (no key, network, parsing, etc.).
 *
 * One implementation here means every feature (exec summaries, blog writing,
 * future agents) gets the same provider routing for free.
 *
 * Credit-saver mode (toggled in Settings → AI):
 *   - prepends "Be terse — 2-4 sentences" to the system prompt
 *   - caps maxTokens at 500
 *   - lowers temperature for deterministic answers (cheaper rerolls)
 *   - features that need length (blog writer) opt out via ignoreCreditSaver
 */
export async function callAI(opts: AiCallOptions): Promise<string | null> {
  const active = await getActiveProvider();
  if (!active) return null;

  // Enforce monthly cap if set
  const cap = await checkMonthlyCap();
  if (cap.capped) {
    void logAiCall({
      feature: opts.feature ?? "general",
      provider: active,
      model: null,
      promptText: opts.user,
      completionText: null,
      status: "blocked_by_cap",
      errorMsg: `Monthly AI cap of $${cap.capUsd?.toFixed(2)} reached.`,
      clientId: opts.clientId ?? null,
    });
    return null;
  }

  let system = opts.system;
  let max = opts.maxTokens ?? 2000;
  let temperature = opts.temperature ?? 0.6;
  const timeoutMs = opts.timeoutMs ?? 60_000;

  if (!opts.ignoreCreditSaver) {
    const saver = await getSetting<boolean>("ai.credit_saver.enabled");
    if (saver) {
      system = `Credit-saver mode: keep your answer to 2-4 short sentences. Skip pleasantries, headers, and preamble. Lead with the most useful information first.\n\n${system}`;
      max = Math.min(max, 500);
      temperature = Math.min(temperature, 0.3);
    }
  }

  // Inject learned style rules from the feedback-driven preference store.
  // Silent on failure — never let the learning layer break the call.
  if (opts.feature) {
    try {
      const { getStylePromptForFeature } = await import("./ai-learn");
      const stylePrompt = await getStylePromptForFeature({
        feature: opts.feature,
        clientId: opts.clientId,
      });
      if (stylePrompt) {
        system = `${system}\n\n${stylePrompt}`;
      }
    } catch {
      // ignore
    }
  }

  // Re-pack — downstream provider helpers spread this onto their request
  const packed: AiCallOptions = {
    system,
    user: opts.user,
    maxTokens: max,
    temperature,
    timeoutMs,
  };

  // Wrap dispatch with logging — each path returns (text, model)
  const start = Date.now();
  let model: string | null = null;
  let text: string | null = null;
  let errorMsg: string | undefined;

  try {
    if (active === "gemini") {
      const k = await getApiKey("gemini");
      if (!k) return null;
      model = "gemini-1.5-flash-latest";
      text = await callGemini({ apiKey: k, ...packed, max, temperature, timeoutMs });
    } else if (active === "groq") {
      const k = await getApiKey("groq");
      if (!k) return null;
      model = "llama-3.3-70b-versatile";
      text = await callOpenAICompat({
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: k,
        model,
        ...opts,
        max,
        temperature,
        timeoutMs,
      });
    } else if (active === "anthropic") {
      const k = await getApiKey("anthropic");
      if (!k) return null;
      model = "claude-haiku-4-5-20251001";
      text = await callAnthropic({ apiKey: k, ...packed, max, temperature, timeoutMs });
    } else if (active === "openai") {
      const k = await getApiKey("openai");
      if (!k) return null;
      model = "gpt-4o-mini";
      text = await callOpenAICompat({
        endpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: k,
        model,
        ...opts,
        max,
        temperature,
        timeoutMs,
      });
    } else if (active === "openrouter") {
      const k = await getApiKey("openrouter");
      if (!k) return null;
      model = "meta-llama/llama-3.3-70b-instruct:free";
      text = await callOpenAICompat({
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: k,
        model,
        extraHeaders: { "x-title": "SEO Tool" },
        ...opts,
        max,
        temperature,
        timeoutMs,
      });
    } else if (active === "perplexity") {
      const k = await getApiKey("perplexity");
      if (!k) return null;
      model = "sonar";
      text = await callOpenAICompat({
        endpoint: "https://api.perplexity.ai/chat/completions",
        apiKey: k,
        model,
        ...opts,
        max,
        temperature,
        timeoutMs,
      });
    } else if (active === "ollama") {
      const url = await getOllamaUrl();
      model = "llama3";
      text = await callOllama({ url, ...packed, max, temperature, timeoutMs });
    }
  } catch (err) {
    errorMsg = (err as Error).message;
    text = null;
  }

  // Log every call (success or failure) — async-fire, never block
  void logAiCall({
    feature: opts.feature ?? "general",
    provider: active,
    model,
    promptText: `${system}\n\n${opts.user}`,
    completionText: text,
    latencyMs: Date.now() - start,
    clientId: opts.clientId ?? null,
    status: text ? "ok" : "error",
    errorMsg,
  });

  return text;
}

type CallArgs = AiCallOptions & {
  apiKey?: string;
  max: number;
  temperature: number;
  timeoutMs: number;
};

async function callGemini(args: CallArgs): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(args.apiKey ?? "")}`;
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), args.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: c.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${args.system}\n\n${args.user}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: args.max,
          temperature: args.temperature,
        },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim() || null
    );
  } finally {
    clearTimeout(t);
  }
}

async function callAnthropic(args: CallArgs): Promise<string | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), args.timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: c.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": args.apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: args.max,
        temperature: args.temperature,
        system: args.system,
        messages: [{ role: "user", content: args.user }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    return (
      data.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim() || null
    );
  } finally {
    clearTimeout(t);
  }
}

async function callOpenAICompat(args: CallArgs & {
  endpoint: string;
  model: string;
  extraHeaders?: Record<string, string>;
}): Promise<string | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), args.timeoutMs);
  try {
    const res = await fetch(args.endpoint, {
      method: "POST",
      signal: c.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${args.apiKey ?? ""}`,
        ...(args.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: args.model,
        max_tokens: args.max,
        temperature: args.temperature,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } finally {
    clearTimeout(t);
  }
}

async function callOllama(args: CallArgs & { url: string }): Promise<string | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), args.timeoutMs);
  try {
    const res = await fetch(`${args.url}/api/chat`, {
      method: "POST",
      signal: c.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        stream: false,
        options: { temperature: args.temperature, num_predict: args.max },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      message?: { content?: string };
    };
    return data.message?.content?.trim() ?? null;
  } finally {
    clearTimeout(t);
  }
}
