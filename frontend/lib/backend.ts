import { cookies } from "next/headers";

export function backendFetch(url: string, init: RequestInit = {}) {
  const session = cookies().get("reso-session")?.value;
  if (!session) throw new Error("Reload the workspace to start a session.");
  const headers = new Headers(init.headers);
  headers.set("X-Reso-Session", session);
  return fetch(url, { ...init, headers, cache: "no-store" });
}
