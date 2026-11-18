import { NextRequest, NextResponse } from "next/server";
import type { AskResponse, ApiError } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";
const MAX_QUESTION_LENGTH = 16_000;
const ASK_TIMEOUT_MS = 60_000;

function extractErrorMessage(rawText: string, fallback: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return fallback;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      if (typeof record.error === "string" && record.error.trim()) {
        return record.error.trim();
      }
      if (typeof record.detail === "string" && record.detail.trim()) {
        return record.detail.trim();
      }
    }
  } catch {
    // Plain-text upstream error body
  }

  return trimmed;
}

export async function POST(req: NextRequest): Promise<NextResponse<AskResponse | ApiError>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Invalid request: malformed JSON body" },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("question" in body) ||
    typeof (body as { question: unknown }).question !== "string"
  ) {
    return NextResponse.json<ApiError>(
      { error: "Invalid request: 'question' must be a string" },
      { status: 400 }
    );
  }

  const question = (body as { question: string }).question.trim();
  if (question.length === 0) {
    return NextResponse.json<ApiError>(
      { error: "Invalid request: question cannot be empty" },
      { status: 400 }
    );
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json<ApiError>(
      { error: `Invalid request: question exceeds ${MAX_QUESTION_LENGTH} characters` },
      { status: 413 }
    );
  }

  const askUrl = new URL("/ask", BACKEND_URL);
  const timeoutSignal = AbortSignal.timeout(ASK_TIMEOUT_MS);
  const combinedSignal =
    typeof AbortSignal.any === "function"
      ? AbortSignal.any([req.signal, timeoutSignal])
      : timeoutSignal;

  try {
    const res = await fetch(askUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ question }),
      cache: "no-store",
      signal: combinedSignal,
    });

    const responseText = await res.text();

    if (!res.ok) {
      const detail = extractErrorMessage(
        responseText,
        res.statusText || `HTTP ${res.status}`
      );
      return NextResponse.json<ApiError>(
        { error: detail },
        { status: res.status }
      );
    }

    if (!responseText.trim()) {
      return NextResponse.json<ApiError>(
        { error: "Backend returned an empty response" },
        { status: 502 }
      );
    }

    let data: AskResponse;
    try {
      data = JSON.parse(responseText) as AskResponse;
    } catch {
      return NextResponse.json<ApiError>(
        { error: "Invalid JSON response from backend" },
        { status: 502 }
      );
    }

    return NextResponse.json<AskResponse>(data, { status: 200 });
  } catch (err) {
    if (req.signal.aborted) {
      return NextResponse.json<ApiError>(
        { error: "Request cancelled by client" },
        { status: 499 }
      );
    }

    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");

    if (isTimeout) {
      return NextResponse.json<ApiError>(
        { error: "The assistant took too long to respond. Please try again." },
        { status: 504 }
      );
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<ApiError>(
      { error: `Unable to reach RAG backend: ${message}` },
      { status: 502 }
    );
  }
}
