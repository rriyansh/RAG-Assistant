import { backendFetch } from "@/lib/backend";
import { NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const res = await backendFetch(`${BACKEND}/keys`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
