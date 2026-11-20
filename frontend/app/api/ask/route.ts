import { backendFetch } from "@/lib/backend";
// app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.RAG_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.question !== "string" || !body.question.trim()) {
    return NextResponse.json({ detail: "Enter a question to continue." }, { status: 400 });
  }
  try {
    const res = await backendFetch(`${BACKEND_URL}/ask${body.stream ? "/stream" : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: req.signal,
    });
    if (body.stream && res.ok) return new Response(res.body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { detail: "Could not reach the workspace backend." },
      { status: 502 }
    );
  }
}
