import { NextRequest } from "next/server";

const BACKEND_URL = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: await req.text(),
      signal: req.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "application/x-ndjson" },
    });
  } catch (error) {
    return Response.json({ detail: error instanceof Error ? error.message : "Backend unreachable" }, { status: 502 });
  }
}
