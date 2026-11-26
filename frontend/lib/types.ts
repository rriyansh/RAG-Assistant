import type { Locale } from "./locales";
export type FontId =
  | "open-sans"
  | "system"
  | "dm-sans"
  | "josefin-sans"
  | "fredoka"
  | "outfit"
  | "plus-jakarta-sans"
  | "google-sans"
  | "manrope"
  | "source-sans-3";

export interface UserProfile {
  locale?: Locale;
  replyLocale?: Locale;
  defaultMode?: ApiMode;
  username?: string;
  theme?: "system" | "light" | "dark";
  haptics?: boolean;
  notifications?: boolean;
  workspaceShortcut?: boolean;
  actionButton?: "settings" | "connectors";
  tone?: "formal" | "casual" | "technical";
  instructions?: string;
  webSearchDefault?: boolean;
  retention?: "30" | "90" | "forever";
  rememberChats?: boolean;
  name: string;
  assistantName: string;
  headline: string;
  bodyText: string;
  font: FontId;
  avatarDataUrl?: string;
  assistantLogo?: string;
  includeAudio?: boolean;
  workNetworkAccess?: boolean;
  pasteAsFile?: "ask" | "always" | "never";
  typeahead?: boolean;
  replySuggestions?: boolean;
  thinkHarder?: boolean;
  /** Supabase authenticated user id when Google login is used; absent in anonymous/local mode. */
  supabaseUserId?: string;
  /** Authenticated user email when Google login is used; absent in anonymous/local mode. */
  email?: string;
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

export type ApiMode = "chat" | "agent";
export interface FileReview {
  repo: string; branch: string; path: string; message: string;
  content: string; diff: string; expected_sha: string;
}
export interface ToolCall {
  approval?: string;
  review?: FileReview;
  id: string;
  name: string;
  args: Record<string, unknown>;
  result_summary: string;
  status: "pending" | "ok" | "error";
  duration_ms: number;
  error?: string | null;
}

export interface PendingConsent {
  approval: string;
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

export interface GeneratedFileItem {
  filename: string;
  language: string;
  content: string;
  mimeType: string;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  createdAt?: number;
  sources?: SourceItem[];
  sourceType?: string;
  toolCalls?: ToolCall[];
  pendingConsent?: PendingConsent[];
  originalQuestion?: string;
  connectorId?: string;
  webSearch?: boolean;
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
  hosted?: boolean;
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
  hosted_ready?: boolean;
  keys: KeyStatusMap;
  active_provider?: string;
}

export interface KeySetPayload { provider: string; api_key: string; model?: string; base_url?: string }
export interface KeyTestResponse { valid: boolean; model?: string; error?: string }
export interface Source { doc_name: string; page_number: number; score: number }
export interface CannedResponse { id: string; trigger: string; response: string; matchMode: "exact" | "contains" }

export type AskErrorCode = "network" | "auth" | "rate_limit" | "backend" | "stream" | "unknown";

export interface AskError extends Error {
  code: AskErrorCode;
  status?: number;
}
