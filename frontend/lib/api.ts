import type { AskRequest, AskResponse, ApiError } from "./types";

export async function askQuestion(question: string): Promise<AskResponse> {
  const payload: AskRequest = { question };
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as ApiError;
      if (body.error) detail = body.error;
    } catch {
      // ignore parse failure, use status text
    }
    throw new Error(detail);
  }

  return (await res.json()) as AskResponse;
}
