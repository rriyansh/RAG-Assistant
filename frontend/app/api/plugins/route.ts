// app/api/plugins/route.ts
import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.RAG_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/plugins`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Backend unreachable" },
      { status: 502 }
    );
  }
}
