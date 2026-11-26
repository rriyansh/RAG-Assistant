// lib/api.ts
import {
  ApiMode, AskApiResponse,
  ConnectorInfo,
  KeyListResponse,
  LLMConfig,
  PluginInfo,
} from "./types";
import { apiFetch } from "./api-client";

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.error || detail;
    } catch {
      // ignore json parse failure
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export type AskErrorCode = "network" | "auth" | "rate_limit" | "backend" | "stream" | "unknown";

interface AskError extends Error {
  code: AskErrorCode;
  status?: number;
}

function classifyAskError(err: unknown, status?: number): AskError {
  const rawMessage = err instanceof Error ? err.message : "Failed to get a response.";
  const lower = rawMessage.toLowerCase();
  const code: AskErrorCode = (() => {
    if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("api key")) return "auth";
    if (status === 429 || lower.includes("rate limit") || lower.includes("quota") || lower.includes("too many requests")) return "rate_limit";
    if (status === 502 || status === 503 || lower.includes("unavailable") || lower.includes("backend")) return "backend";
    if (status && status >= 400 && status < 500) return "backend";
    if (lower.includes("fetch") || lower.includes("network") || lower.includes("cors") || lower.includes("failed to fetch")) return "network";
    if (lower.includes("stream") || lower.includes("ended early") || lower.includes("parse")) return "stream";
    return "unknown";
  })();
  const specific: Record<AskErrorCode, string> = {
    auth: "Authentication failed. Check your API key or sign in again.",
    rate_limit: "The provider is rate-limited. Please try again shortly.",
    backend: status ? `The backend returned HTTP ${status}.` : "The backend is temporarily unavailable.",
    network: "Network error. Check your internet connection and backend URL.",
    stream: "The response stream was interrupted.",
    unknown: rawMessage,
  };
  const base = new Error(specific[code]) as AskError;
  base.code = code;
  base.status = status;
  return base;
}

export async function askQuestion(
  question: string,
  assistantName: string = "Assistant",
  consent: string[] = [],
  mode: ApiMode = "agent",
  onActivity?: (label: string) => void,
  history: { role: "user" | "assistant"; content: string }[] = [],
  connectorId?: string, webSearch = false, tone?: string, instructions?: string,
  signal?: AbortSignal,
): Promise<AskApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);
  const abort = () => { controller.abort(); clearTimeout(timeoutId); };
  if (signal) { signal.addEventListener("abort", abort, { once: true }); }

  try {
    const res = await apiFetch("/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Reso-Mode": mode },
      body: JSON.stringify({question, assistant_name: assistantName, consent, history, connector_id: connectorId, web_search: webSearch, tone, instructions, stream: true}),
      signal: controller.signal,
    });
    if (!res.ok) {
      const status = res.status;
      await handleJson(res).catch(() => {});
      throw classifyAskError(new Error(`HTTP ${status}`), status);
    }
    if (!res.body) throw new Error("The workspace backend returned no response.");
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    try {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.error) throw classifyAskError(new Error(event.error));
          if (event.activity) onActivity?.(event.activity);
          if (event.result) return event.result as AskApiResponse;
        }
      }
      throw new Error("The response stream ended early.");
    } finally {
      reader.releaseLock();
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw classifyAskError(new Error("The request timed out. Please try again."), 504);
    }
    throw classifyAskError(err);
  } finally {
    clearTimeout(timeoutId);
    if (signal) { signal.removeEventListener("abort", abort); }
  }
}

export async function fetchConnectors(): Promise<ConnectorInfo[]> {
  const res = await apiFetch("/api/connectors", {
    method: "GET",
    cache: "no-store",
  });
  const data = await handleJson<{ connectors: ConnectorInfo[] }>(res);
  return data.connectors || [];
}

export async function connectService(
  id: string,
  credentials: Record<string, string>
): Promise<ConnectorInfo> {
  const res = await apiFetch("/api/connectors/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, credentials }),
  });
  return handleJson<ConnectorInfo>(res);
}

export async function createCustomConnector(payload: {
  id: string;
  name: string;
  description: string;
  endpoint_url: string;
  method: "GET" | "POST";
  api_key?: string;
}): Promise<ConnectorInfo> {
  const res = await apiFetch("/api/connectors/custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<ConnectorInfo>(res);
}

export async function toggleConnector(
  id: string,
  enabled: boolean
): Promise<ConnectorInfo> {
  const res = await apiFetch("/api/connectors/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, enabled }),
  });
  return handleJson<ConnectorInfo>(res);
}

export async function disconnectService(id: string): Promise<void> {
  const res = await apiFetch(`/api/connectors/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await handleJson<{ id: string; status: string }>(res);
}

export async function fetchPlugins(): Promise<PluginInfo[]> {
  const res = await apiFetch("/api/plugins", { method: "GET", cache: "no-store" });
  const data = await handleJson<{ plugins: PluginInfo[] }>(res);
  return data.plugins || [];
}

export async function togglePlugin(
  name: string,
  enabled: boolean
): Promise<{ name: string; enabled: boolean }> {
  const res = await apiFetch("/api/plugins/enable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, enabled }),
  });
  return handleJson<{ name: string; enabled: boolean }>(res);
}

export async function fetchThinking(count: number): Promise<{ messages: string[] }> {
  return handleJson(await apiFetch(`/api/thinking?count=${count}`));
}

export async function fetchThinkingMessages(
  question?: string,
  assistantName: string = "Assistant"
): Promise<string[]> {
  if (question) {
    const res = await apiFetch("/api/thinking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, assistant_name: assistantName }),
    });
    const data = await handleJson<{ messages: string[] }>(res);
    return data.messages;
  }
  const res = await apiFetch("/api/thinking");
  const data = await handleJson<{ messages: string[] }>(res);
  return data.messages;
}

export async function enhancePrompt(prompt: string, mode: ApiMode = "agent"): Promise<string> {
  const res = await apiFetch("/api/prompt/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Reso-Mode": mode },
    body: JSON.stringify({ prompt }),
  });
  const data = await handleJson<{ enhanced_prompt: string }>(res);
  return data.enhanced_prompt;
}

export async function fetchKeys(mode: ApiMode = "agent"): Promise<KeyListResponse> {
  const res = await apiFetch("/api/keys", { cache: "no-store", headers: { "X-Reso-Mode": mode } });
  const data = await handleJson<KeyListResponse>(res);
  return {
    keys: data.keys || {},
    hosted_ready: data.hosted_ready,
    active_provider: data.active_provider || "",
  };
}

export async function detectKeyProvider(apiKey: string): Promise<string> {
  const res = await apiFetch("/api/keys/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const data = await handleJson<{ provider: string }>(res);
  return data.provider;
}

export async function testProviderKey(payload: {
  provider: string;
  api_key: string;
  base_url?: string;
  model?: string;
}): Promise<{ valid: boolean; model?: string; error?: string }> {
  const res = await apiFetch("/api/keys/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ valid: boolean; model?: string; error?: string }>(res);
}

export async function saveProviderKey(payload: {
  provider: string;
  api_key: string;
  base_url?: string;
  model?: string;
}, mode: ApiMode = "agent"): Promise<void> {
  const res = await apiFetch("/api/keys/set", {
    method: "POST",
    headers: { "X-Reso-Mode": mode, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await handleJson(res);
}

export async function deleteProviderKey(provider: string, mode: ApiMode = "agent"): Promise<void> {
  const res = await apiFetch(`/api/keys/${encodeURIComponent(provider)}`, {
    method: "DELETE", headers: { "X-Reso-Mode": mode },
  });
  await handleJson(res);
}

export async function fetchConfig(mode: ApiMode = "agent"): Promise<LLMConfig> {
  const res = await apiFetch("/api/config", { cache: "no-store", headers: { "X-Reso-Mode": mode } });
  return handleJson<LLMConfig>(res);
}

export async function updateConfig(config: Partial<LLMConfig>, mode: ApiMode = "agent"): Promise<void> {
  const res = await apiFetch("/api/config", {
    method: "POST",
    headers: { "X-Reso-Mode": mode, "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  await handleJson(res);
}

export async function updateConfigParams(params: {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}): Promise<void> {
  const res = await apiFetch("/api/config/params", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  await handleJson(res);
}
