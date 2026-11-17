import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const count = req.nextUrl.searchParams.get("count") ?? "20";
  const res = await fetch(`${BACKEND}/thinking/messages?count=${count}`, {
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
