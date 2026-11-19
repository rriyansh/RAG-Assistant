import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL ?? "http://127.0.0.1:8000";
const UPSTREAM_TIMEOUT_MS = 5000;

export const dynamic = "force-dynamic";

async function forward(
  method: "GET" | "POST",
  body?: string
): Promise<NextResponse> {
  try {
    const res = await fetch(`${BACKEND}/config`, {
      method,
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const raw = await res.text();
    let data: unknown = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON response from backend" },
          { status: 502 }
        );
      }
    }
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    return NextResponse.json(
      { error: isTimeout ? "Backend timed out" : "Unable to reach RAG backend" },
      { status: isTimeout ? 504 : 502 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return forward("GET");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return forward("POST", await req.text());
}
