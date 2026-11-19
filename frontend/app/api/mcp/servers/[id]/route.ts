// app/api/mcp/servers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.RAG_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const serverId = encodeURIComponent(context.params.id);
    const res = await fetch(`${BACKEND_URL}/mcp/servers/${serverId}`, {
      method: "DELETE",
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
