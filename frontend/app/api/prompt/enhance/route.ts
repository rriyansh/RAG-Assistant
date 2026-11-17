import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const res = await fetch(`${BACKEND}/prompt/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
