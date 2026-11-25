import {backendFetch} from "@/lib/backend";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider") || "";
  const base = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  return backendFetch(base + "/models?provider=" + encodeURIComponent(provider));
}
