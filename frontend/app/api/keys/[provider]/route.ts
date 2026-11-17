import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { provider: string } }
): Promise<NextResponse> {
  const res = await fetch(`${BACKEND}/keys/${params.provider}`, {
    method: "DELETE",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
