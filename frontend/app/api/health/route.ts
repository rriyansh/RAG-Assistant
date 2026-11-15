import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";

export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { status: "degraded", backend: res.status },
        { status: 200 }
      );
    }
    const data = (await res.json()) as { status: string };
    return NextResponse.json({ status: "ok", backend: data.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { status: "unreachable", error: message },
      { status: 200 }
    );
  }
}
