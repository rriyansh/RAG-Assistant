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
  local?: boolean;
  enhanced?: boolean;
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

export interface KeyDetectResponse {
  provider: string;
  hint: string;
}

export interface ThinkingResponse {
  messages: string[];
  generated_by: "template" | "llm";
}

export interface EnhanceResponse {
  original: string;
  enhanced: string;
}

export interface ParamsInfo {
  llm_provider: string;
  embedding_provider: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  web_search_provider: string;
  web_search_enabled: boolean;
  web_fallback_threshold: number;
}

export type FontId =
  | "system"
  | "dm-sans"
  | "josefin-sans"
  | "fredoka"
  | "open-sans"
  | "outfit"
  | "plus-jakarta-sans";

export interface Profile {
  name: string;
  avatarDataUrl: string;
  assistantName: string;
  assistantLogo: string;
  headline: string;
  bodyText: string;
  font: FontId;
}

export interface CannedResponse {
  id: string;
  trigger: string;
  response: string;
  matchMode: "contains" | "exact";
}
