import { cookies, headers as requestHeaders } from "next/headers";

export async function backendFetch(url: string, init: RequestInit = {}) {
  const session = cookies().get("reso-session")?.value;
  if (!session) return Response.json({ detail: "Reload the workspace to start a session." }, { status: 401 });
  const headers = new Headers(init.headers);
  headers.set("X-Reso-Session", session);
  headers.set("X-Reso-Mode", requestHeaders().get("x-reso-mode") === "chat" ? "chat" : "agent");
  try {
    const target = new URL(url);
    if (target.hostname === "localhost") target.hostname = "127.0.0.1";
    const res = await fetch(target, { ...init, headers, cache: "no-store" });
    if (!res.ok && !res.headers.get("content-type")?.includes("json")) {
      return Response.json({ detail: `Workspace backend returned HTTP ${res.status}. Check RAG_BACKEND_URL and server access.` }, { status: res.status });
    }
    return res;
  } catch (error) {
    if (init.signal?.aborted) throw error;
    return Response.json({ detail: "Workspace backend unavailable. Start the API and check RAG_BACKEND_URL." }, { status: 502 });
  }
}
