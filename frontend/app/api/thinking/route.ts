import { backendFetch } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DEFAULT_COUNT = 20;
const MIN_COUNT = 1;
const MAX_COUNT = 100;
const UPSTREAM_TIMEOUT_MS = 5000;

export const dynamic = "force-dynamic";

function parseCount(raw: string | null): number {
  if (!raw) return DEFAULT_COUNT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_COUNT;
  return Math.min(Math.max(parsed, MIN_COUNT), MAX_COUNT);
}

async function forward(
  path: string,
  method: "GET" | "POST",
  body?: string
): Promise<NextResponse> {
  try {
    const res = await backendFetch(`${BACKEND}${path}`, {
      method,
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const rawBody = await res.text();
    let data: unknown = null;
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON response from backend", messages: [] },
          { status: 502 }
        );
      }
    }
    return NextResponse.json(data ?? { messages: [] }, { status: res.status });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    return NextResponse.json(
      {
        error: isTimeout
          ? "Backend timed out while fetching thinking messages"
          : "Unable to reach RAG backend",
        messages: [],
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const count = parseCount(req.nextUrl.searchParams.get("count"));
  return forward(`/thinking/messages?count=${count}`, "GET");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return forward("/thinking/generate", "POST", await req.text());
}
