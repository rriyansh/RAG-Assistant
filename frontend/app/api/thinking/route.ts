import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const count = parseCount(req.nextUrl.searchParams.get("count"));

  const upstreamUrl = new URL("/thinking/messages", BACKEND);
  upstreamUrl.searchParams.set("count", String(count));

  try {
    const res = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
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

    if (!res.ok) {
      return NextResponse.json(
        typeof data === "object" && data !== null
          ? data
          : { error: `Backend returned status ${res.status}`, messages: [] },
        { status: res.status }
      );
    }

    return NextResponse.json(data ?? { messages: [] }, { status: 200 });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");

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
