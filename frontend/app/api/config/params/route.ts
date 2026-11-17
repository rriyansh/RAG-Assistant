import { NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const res = await fetch(`${BACKEND}/config/params`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
