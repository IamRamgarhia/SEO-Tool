// Popup logic — captures the active tab + sends directly to /api/v1/capture
// when an API key is configured, OR opens the local app with URL params.
const STORAGE_KEY = "seo-tool-app-url";
const API_KEY_STORAGE = "seo-tool-api-key";
const DEFAULT_URL = "http://localhost:3000";

const $ = (id) => document.getElementById(id);

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getAppUrl() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || DEFAULT_URL;
}

async function getApiKey() {
  const stored = await chrome.storage.local.get(API_KEY_STORAGE);
  return stored[API_KEY_STORAGE] || "";
}

async function setAppUrl(url) {
  await chrome.storage.local.set({ [STORAGE_KEY]: url.replace(/\/+$/, "") });
}
async function setApiKey(key) {
  await chrome.storage.local.set({ [API_KEY_STORAGE]: key.trim() });
}

function setStatus(msg, level = "info") {
  const el = $("status");
  el.textContent = msg;
  el.className = `footer ${level === "ok" ? "ok" : level === "err" ? "err" : ""}`;
}

async function init() {
  const tab = await getActiveTab();
  $("title").textContent = tab?.title || "—";
  $("url").textContent = tab?.url || "—";

  const appUrl = await getAppUrl();
  $("app-url").value = appUrl;
  const apiKey = await getApiKey();
  if ($("api-key")) $("api-key").value = apiKey;

  $("config-toggle").addEventListener("click", () => {
    $("config-panel").classList.toggle("open");
  });
  $("app-url").addEventListener("change", async (e) => {
    await setAppUrl(e.target.value);
    setStatus("App URL saved", "ok");
  });
  if ($("api-key")) {
    $("api-key").addEventListener("change", async (e) => {
      await setApiKey(e.target.value);
      setStatus("API key saved", "ok");
    });
  }

  $("add-as-client").addEventListener("click", () =>
    openInApp(tab, "/clients/new"),
  );
  $("add-as-competitor").addEventListener("click", () =>
    openInApp(tab, "/competitors"),
  );
  $("track-changes").addEventListener("click", () => openInApp(tab, "/monitor"));
  $("audit-now").addEventListener("click", () => openInApp(tab, "/grader"));
  if ($("capture-page")) {
    $("capture-page").addEventListener("click", () => capturePage(tab));
  }
}

async function openInApp(tab, path) {
  if (!tab?.url) {
    setStatus("No active tab", "err");
    return;
  }
  const appUrl = await getAppUrl();
  const sep = path.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    url: tab.url,
    name: tab.title || "",
  });
  const target = `${appUrl}${path}${sep}${params.toString()}`;
  await chrome.tabs.create({ url: target });
  setStatus("Opened in SEO Tool", "ok");
}

/**
 * Direct API capture. Runs an extractor in the page context, picks the
 * right capture type by URL pattern, then POSTs to /api/v1/capture.
 */
async function capturePage(tab) {
  if (!tab?.id) {
    setStatus("No tab to capture", "err");
    return;
  }
  const apiKey = await getApiKey();
  if (!apiKey) {
    setStatus("Add an API key first (⚙)", "err");
    $("config-panel").classList.add("open");
    return;
  }
  setStatus("Extracting page…", "info");
  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPagePayload,
  });
  if (!result) {
    setStatus("Extraction failed", "err");
    return;
  }
  const appUrl = await getAppUrl();
  try {
    const res = await fetch(`${appUrl}/api/v1/capture`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        type: result.type,
        url: tab.url,
        title: tab.title,
        payload: result.payload,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      setStatus(`Capture failed (${res.status}): ${t.slice(0, 60)}`, "err");
      return;
    }
    setStatus(`Captured (${result.type}) ✓`, "ok");
  } catch (err) {
    setStatus(`Network error: ${(err && err.message) || err}`, "err");
  }
}

// Runs in the page context (different JS context — has full DOM access).
function extractPagePayload() {
  const url = location.href;

  // Google Search Console — capture rows table
  if (/\/\/search\.google\.com\/search-console/.test(url)) {
    const rows = Array.from(
      document.querySelectorAll("[role='row'], tr"),
    ).slice(0, 100);
    const data = rows
      .map((r) =>
        Array.from(r.querySelectorAll("[role='cell'], td"))
          .map((c) => c.textContent.trim())
          .filter(Boolean),
      )
      .filter((r) => r.length > 1);
    return { type: "gsc_table", payload: { rows: data } };
  }

  // PageSpeed Insights — capture core metrics
  if (/pagespeed\.web\.dev/.test(url)) {
    const metrics = {};
    document.querySelectorAll("[id*='metric'], [class*='lh-metric']").forEach((m) => {
      const label = m.querySelector("[class*='label']")?.textContent?.trim();
      const value = m.querySelector("[class*='value']")?.textContent?.trim();
      if (label && value) metrics[label] = value;
    });
    const score =
      document.querySelector("[class*='lh-gauge__percentage']")?.textContent?.trim() ?? null;
    return { type: "pagespeed", payload: { score, metrics } };
  }

  // Google SERP — capture top organic results + PAA
  if (/^https:\/\/www\.google\.com\/search/.test(url)) {
    const results = Array.from(
      document.querySelectorAll("div.g, div[data-snc]"),
    )
      .slice(0, 20)
      .map((r) => {
        const a = r.querySelector("a[href^='http']");
        const h3 = r.querySelector("h3");
        return {
          url: a?.href,
          title: h3?.textContent?.trim(),
        };
      })
      .filter((r) => r.url && r.title);
    return { type: "serp", payload: { results } };
  }

  // Default — page facts (title, meta, h1, schema types, link counts)
  const title = document.title;
  const desc =
    document.querySelector("meta[name='description']")?.content ?? null;
  const canonical =
    document.querySelector("link[rel='canonical']")?.href ?? null;
  const h1 = document.querySelector("h1")?.textContent?.trim() ?? null;
  const schemaTypes = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  )
    .flatMap((s) => {
      try {
        const j = JSON.parse(s.textContent);
        const arr = Array.isArray(j) ? j : [j];
        return arr.map((x) => x?.["@type"]).filter(Boolean);
      } catch {
        return [];
      }
    })
    .slice(0, 10);
  const linkCount = document.querySelectorAll("a[href]").length;
  const imageCount = document.querySelectorAll("img").length;
  return {
    type: "page",
    payload: {
      title,
      description: desc,
      canonical,
      h1,
      schemaTypes,
      linkCount,
      imageCount,
    },
  };
}

init();
