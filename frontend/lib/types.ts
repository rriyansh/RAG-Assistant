// lib/types.ts

export type FontId =
  | "system"
  | "dm-sans"
  | "josefin-sans"
  | "fredoka"
  | "open-sans"
  | "outfit"
  | "plus-jakarta-sans";

export interface UserProfile {
  name: string;
  assistantName: string;
  headline: string;
  bodyText: string;
  font: FontId;
  avatarDataUrl?: string;
  assistantLogo?: string;
}

export interface SourceItem {
  source_type?: "pdf" | "web" | "hybrid" | string;
  doc_name?: string;
  title?: string;
  page?: number;
  url?: string;
  text?: string;
  snippet?: string;
  score?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result_summary: string;
  status: "pending" | "ok" | "error";
  duration_ms: number;
  error?: string | null;
}

export interface PendingConsent {
  name: string;
  args: Record<string, unknown>;
}

export interface ConnectorField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | string;
  placeholder: string;
  required: boolean;
  helper_text?: string;
}

export interface ConnectorInfo {
  id: string;
  name: string;
  category: "built_in" | "google" | "productivity" | "developer" | "custom" | string;
  description: string;
  auth_type: string;
  built_in: boolean;
  connected: boolean;
  enabled: boolean;
  status: "connected" | "disabled" | "disconnected" | string;
  account_label: string;
  tool_count: number;
  tools: string[];
  fields: ConnectorField[];
}

export interface PluginInfo {
  name: string;
  description: string;
  requires_consent: boolean;
  source: "internal" | "connector" | "mcp";
  enabled: boolean;
  server_id?: string | null;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: SourceItem[];
  sourceType?: string;
  toolCalls?: ToolCall[];
  pendingConsent?: PendingConsent[];
  originalQuestion?: string;
  approvedConsent?: string[];
}

export interface AskApiResponse {
  answer: string;
  sources: SourceItem[];
  source_type?: string;
  tool_calls?: ToolCall[];
  pending_consent?: string[];
}

export interface LLMConfig {
  provider: string;
  model: string;
  base_url?: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
}

export interface KeyStatusMap {
  [provider: string]: {
    configured: boolean;
    masked_key: string;
    model?: string;
    base_url?: string;
  };
}

export interface KeyListResponse {
  keys: KeyStatusMap;
  active_provider?: string;
}
