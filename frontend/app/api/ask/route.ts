import { backendFetch } from "@/lib/backend";
// app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.RAG_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await backendFetch(`${BACKEND_URL}/ask${body.stream ? "/stream" : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (body.stream && res.ok) return new Response(res.body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Backend unreachable" },
      { status: 502 }
    );
  }
}
