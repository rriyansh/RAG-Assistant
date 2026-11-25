import { backendFetch } from "@/lib/backend";

export async function POST(request: Request) {
  const backend = process.env.RAG_BACKEND_URL || "http://127.0.0.1:8000";
  const upstream = await backendFetch(backend + "/github/commit", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: await request.text(),
  });
  return new Response(upstream.body, {status: upstream.status, headers: {"Content-Type":"application/json"}});
}
