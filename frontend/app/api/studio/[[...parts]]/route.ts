import { backendFetch } from "@/lib/backend";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
async function forward(req: NextRequest, ctx: { params: { parts?: string[] } }) {
  const parts = ctx.params.parts ?? [];
  if (parts.length > 2 || (parts[0] && !/^[a-f0-9-]{36}$/.test(parts[0])) ||
      (parts[1] && !["key", "chat"].includes(parts[1]))) {
    return Response.json({detail:"Unknown assistant route"}, {status:404});
  }
  if (!["GET", "HEAD"].includes(req.method) && req.headers.get("origin") && new URL(req.headers.get("origin")!).host !== req.headers.get("host")) {
    return Response.json({detail:"Invalid origin"}, {status:403});
  }
  const base = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  return backendFetch(base + "/v1/assistants" + parts.map(p => "/" + p).join(""), {
    method:req.method, headers:{"Content-Type":"application/json"},
    body:["POST","PUT"].includes(req.method) ? await req.text() : undefined,
    signal:AbortSignal.timeout(90000)
  });
}
export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
