export interface Source {
  doc_name: string;
  page_number: number;
  source_type: "pdf" | "web";
  score: number;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  used_web_search: boolean;
  llm_provider: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  usedWebSearch?: boolean;
  timestamp: number;
  pending?: boolean;
  error?: boolean;
}

export interface KeyStatus {
  configured: boolean;
  masked_key: string;
  model: string;
  base_url: string;
}

export interface KeyListResponse {
  keys: Record<string, KeyStatus>;
  active_provider: string;
}

export interface KeySetPayload {
  provider: string;
  api_key: string;
  model?: string;
  base_url?: string;
}

export interface KeyTestResponse {
  ok: boolean;
  reply: string;
  error: string;
}

export interface ThinkingResponse {
  messages: string[];
  generated_by: "template" | "llm";
}
