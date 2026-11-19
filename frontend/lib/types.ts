// lib/types.ts

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

export interface MCPServer {
  id: string;
  transport: "stdio" | "http";
  status: string;
  tool_count: number;
  url_or_command: string;
}

export interface PluginInfo {
  name: string;
  description: string;
  requires_consent: boolean;
  source: "internal" | "mcp";
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
