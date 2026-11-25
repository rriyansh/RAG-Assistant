import { backendFetch } from "@/lib/backend";
const base = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export const dynamic = "force-dynamic";
export function GET() { return backendFetch(base + "/connections/github/repository"); }
export async function PUT(request: Request) {
  const data = await request.json();
  return backendFetch(base + "/connections/github/repository", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({repository:data.repository})});
}
