// lib/api.ts
import {
  ApiMode, AskApiResponse,
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
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function askQuestion(
  question: string,
  assistantName: string = "Assistant",
  consent: string[] = [],
  mode: ApiMode = "agent",
  onActivity?: (label: string) => void,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<AskApiResponse> {
  const res = await fetch("/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Reso-Mode": mode },
    body: JSON.stringify({question, assistant_name: assistantName, consent, history, stream: true}),
  });
  if (!res.ok) await handleJson(res);
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
        if (event.error) throw new Error(event.error);
        if (event.activity) onActivity?.(event.activity);
        if (event.result) return event.result as AskApiResponse;
      }
    }
    throw new Error("The response stream ended early.");
  } finally {
    reader.releaseLock();
  }
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

export async function fetchThinking(count: number): Promise<{ messages: string[] }> {
  return handleJson(await fetch(`/api/thinking?count=${count}`));
}

export async function fetchThinkingMessages(
  question?: string,
  assistantName: string = "Assistant"
): Promise<string[]> {
  if (question) {
    const res = await fetch("/api/thinking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, assistant_name: assistantName }),
    });
    const data = await handleJson<{ messages: string[] }>(res);
    return data.messages;
  }
  const res = await fetch("/api/thinking");
  const data = await handleJson<{ messages: string[] }>(res);
  return data.messages;
}

export async function enhancePrompt(prompt: string, mode: ApiMode = "agent"): Promise<string> {
  const res = await fetch("/api/prompt/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Reso-Mode": mode },
    body: JSON.stringify({ prompt }),
  });
  const data = await handleJson<{ enhanced_prompt: string }>(res);
  return data.enhanced_prompt;
}

export async function fetchKeys(mode: ApiMode = "agent"): Promise<KeyListResponse> {
  const res = await fetch("/api/keys", { cache: "no-store", headers: { "X-Reso-Mode": mode } });
  const data = await handleJson<KeyListResponse>(res);
  return {
    keys: data.keys || {},
    hosted_ready: data.hosted_ready,
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
}, mode: ApiMode = "agent"): Promise<void> {
  const res = await fetch("/api/keys/set", {
    method: "POST",
    headers: { "X-Reso-Mode": mode, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await handleJson(res);
}

export async function deleteProviderKey(provider: string, mode: ApiMode = "agent"): Promise<void> {
  const res = await fetch(`/api/keys/${encodeURIComponent(provider)}`, {
    method: "DELETE", headers: { "X-Reso-Mode": mode },
  });
  await handleJson(res);
}

export async function fetchConfig(mode: ApiMode = "agent"): Promise<LLMConfig> {
  const res = await fetch("/api/config", { cache: "no-store", headers: { "X-Reso-Mode": mode } });
  return handleJson<LLMConfig>(res);
}

export async function updateConfig(config: Partial<LLMConfig>, mode: ApiMode = "agent"): Promise<void> {
  const res = await fetch("/api/config", {
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
  const res = await fetch("/api/config/params", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  await handleJson(res);
}
