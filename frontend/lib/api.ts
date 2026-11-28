// lib/api.ts
import {
  AskApiResponse,
  ConnectorInfo,
  KeyListResponse,
  LLMConfig,
  PluginInfo,
} from "./types";

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.error || detail;
    } catch {
      // ignore json parse failure
    }
    const retryAfter = res.headers.get("Retry-After");
    throw new Error(retryAfter ? `${detail} Retry after ${retryAfter}s.` : detail);
  }
  return res.json() as Promise<T>;
}

export async function askQuestion(
  question: string,
  assistantName: string = "Assistant",
  consent: string[] = []
): Promise<AskApiResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      assistant_name: assistantName,
      consent,
    }),
  });
  return handleJson<AskApiResponse>(res);
}

export async function askQuestionStream(
  question: string,
  assistantName: string,
  consent: string[],
  onEvent: (event: Record<string, unknown>) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/ask/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ question, assistant_name: assistantName, consent }),
    signal,
  });
  if (!res.ok || !res.body) await handleJson(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
    if (done) break;
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer));
}

export async function fetchConnectors(): Promise<ConnectorInfo[]> {
  const res = await fetch("/api/connectors", {
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
  const res = await fetch("/api/connectors/connect", {
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
  const res = await fetch("/api/connectors/custom", {
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
  const res = await fetch("/api/connectors/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, enabled }),
  });
  return handleJson<ConnectorInfo>(res);
}

export async function disconnectService(id: string): Promise<void> {
  const res = await fetch(`/api/connectors/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await handleJson<{ id: string; status: string }>(res);
}

export async function fetchPlugins(): Promise<PluginInfo[]> {
  const res = await fetch("/api/plugins", { method: "GET", cache: "no-store" });
  const data = await handleJson<{ plugins: PluginInfo[] }>(res);
  return data.plugins || [];
}

export async function togglePlugin(
  name: string,
  enabled: boolean
): Promise<{ name: string; enabled: boolean }> {
  const res = await fetch("/api/plugins/enable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, enabled }),
  });
  return handleJson<{ name: string; enabled: boolean }>(res);
}

export async function fetchThinkingMessages(
  question?: string,
  assistantName: string = "Assistant"
): Promise<string[]> {
  if (question) {
    const res = await fetch("/api/thinking/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, assistant_name: assistantName }),
    });
    const data = await handleJson<{ messages: string[] }>(res);
    return data.messages;
  }
  const res = await fetch("/api/thinking/messages");
  const data = await handleJson<{ messages: string[] }>(res);
  return data.messages;
}

export async function enhancePrompt(prompt: string): Promise<string> {
  const res = await fetch("/api/prompt/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await handleJson<{ enhanced_prompt: string }>(res);
  return data.enhanced_prompt;
}

export async function fetchKeys(): Promise<KeyListResponse> {
  const res = await fetch("/api/keys", { cache: "no-store" });
  const data = await handleJson<KeyListResponse>(res);
  return {
    keys: data.keys || {},
    active_provider: data.active_provider || "",
  };
}

export async function detectKeyProvider(apiKey: string): Promise<string> {
  const res = await fetch("/api/keys/detect", {
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
  const res = await fetch("/api/keys/test", {
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
}): Promise<void> {
  const res = await fetch("/api/keys/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await handleJson(res);
}

export async function deleteProviderKey(provider: string): Promise<void> {
  const res = await fetch(`/api/keys/${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
  await handleJson(res);
}

export async function fetchConfig(): Promise<LLMConfig> {
  const res = await fetch("/api/config", { cache: "no-store" });
  return handleJson<LLMConfig>(res);
}

export async function updateConfig(config: Partial<LLMConfig>): Promise<void> {
  const res = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  await handleJson(res);
}

export async function updateConfigParams(params: {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}): Promise<void> {
  const res = await fetch("/api/config/params", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  await handleJson(res);
}
