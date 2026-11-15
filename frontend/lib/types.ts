export interface Source {
  doc_name: string;
  page_number: number;
  score: number;
}

export interface AskRequest {
  question: string;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  used_web_search: boolean;
}

export interface ApiError {
  error: string;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sources?: Source[];
  usedWebSearch?: boolean;
  timestamp: number;
  pending?: boolean;
  error?: boolean;
}
