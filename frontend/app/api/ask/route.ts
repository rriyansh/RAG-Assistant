import { NextRequest, NextResponse } from "next/server";
import type { AskResponse, ApiError } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== "object" ||
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

    const res = await fetch(`${BACKEND_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      cache: "no-store"
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return NextResponse.json<ApiError>(
        { error: `Backend error: ${text || res.status}` },
        { status: res.status }
      );
    }

    const data = (await res.json()) as AskResponse;
    return NextResponse.json<AskResponse>(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<ApiError>(
      { error: `Request failed: ${message}` },
      { status: 500 }
    );
  }
}
