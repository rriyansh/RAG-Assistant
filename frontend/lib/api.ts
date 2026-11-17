import type {
  AskResponse, KeyListResponse, KeySetPayload, KeyTestResponse,
  KeyDetectResponse, ThinkingResponse, EnhanceResponse, ParamsInfo,
} from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error || body?.detail) detail = body.error ?? body.detail;
    } catch {}
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export async function askQuestion(
  question: string,
  assistantName = "RAG Assistant"
): Promise<AskResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ question, assistant_name: assistantName }),
    cache: "no-store",
  });
  return asJson<AskResponse>(res);
}

export async function fetchKeys(): Promise<KeyListResponse> {
  const res = await fetch("/api/keys", { cache: "no-store" });
  return asJson<KeyListResponse>(res);
}

export async function detectKey(apiKey: string): Promise<KeyDetectResponse> {
  const res = await fetch("/api/keys/detect", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ api_key: apiKey }),
  });
  return asJson<KeyDetectResponse>(res);
}

export async function testKey(p: KeySetPayload): Promise<KeyTestResponse> {
  const res = await fetch("/api/keys/test", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(p),
  });
  return asJson<KeyTestResponse>(res);
}

export async function saveKey(p: KeySetPayload): Promise<{ ok: boolean }> {
  const res = await fetch("/api/keys/set", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(p),
  });
  return asJson<{ ok: boolean }>(res);
}

export async function deleteKey(provider: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/keys/${provider}`, { method: "DELETE" });
  return asJson<{ ok: boolean }>(res);
}

export async function fetchThinking(count = 20): Promise<ThinkingResponse> {
  const res = await fetch(`/api/thinking/messages?count=${count}`, { cache: "no-store" });
  return asJson<ThinkingResponse>(res);
}

export async function enhancePrompt(prompt: string): Promise<EnhanceResponse> {
  const res = await fetch("/api/prompt/enhance", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ prompt }),
  });
  return asJson<EnhanceResponse>(res);
}

export async function fetchParams(): Promise<ParamsInfo> {
  const res = await fetch("/api/config/params", { cache: "no-store" });
  return asJson<ParamsInfo>(res);
}
