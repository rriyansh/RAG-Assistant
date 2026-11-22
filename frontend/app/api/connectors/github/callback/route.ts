import { backendFetch } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  function finish(status: string) {
    const response = NextResponse.redirect(new URL(`/?connector=github-${status}`, req.url));
    response.cookies.set("reso-github-oauth", "", { path: "/api/connectors/github", maxAge: 0 });
    return response;
  }

  const state = req.cookies.get("reso-github-oauth")?.value;
  const code = req.nextUrl.searchParams.get("code");
  const client = process.env.GITHUB_OAUTH_CLIENT_ID;
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const callback = process.env.GITHUB_OAUTH_CALLBACK_URL;
  if (!state || state !== req.nextUrl.searchParams.get("state") || !code || !client || !secret || !callback) return finish("failed");

  try {
    const exchange = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json" }, redirect: "error",
      body: new URLSearchParams({ client_id: client, client_secret: secret, code, redirect_uri: callback }),
      signal: AbortSignal.timeout(15000),
    });
    const { access_token: token } = await exchange.json();
    if (!exchange.ok || typeof token !== "string" || !token) return finish("failed");
    const backend = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const saved = await backendFetch(`${backend}/connectors/connect`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "github", credentials: { token } }),
    });
    return finish(saved.ok ? "connected" : "failed");
  } catch {
    return finish("failed");
  }
}
