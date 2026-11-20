import { cookies, headers as requestHeaders } from "next/headers";

export function backendFetch(url: string, init: RequestInit = {}) {
  const session = cookies().get("reso-session")?.value;
  if (!session) throw new Error("Reload the workspace to start a session.");
  const headers = new Headers(init.headers);
  headers.set("X-Reso-Session", session);
  headers.set("X-Reso-Mode", requestHeaders().get("x-reso-mode") === "chat" ? "chat" : "agent");
  return fetch(url, { ...init, headers, cache: "no-store" });
}
