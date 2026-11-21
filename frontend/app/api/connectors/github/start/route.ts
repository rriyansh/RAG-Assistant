import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const client = process.env.GITHUB_OAUTH_CLIENT_ID;
  const callback = process.env.GITHUB_OAUTH_CALLBACK_URL;
  if (!client || !callback || !process.env.GITHUB_OAUTH_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?connector=github-unavailable", req.url));
  }
  const state = randomBytes(32).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({ client_id: client, redirect_uri: callback, state,
    scope: process.env.GITHUB_OAUTH_SCOPE || "read:user" }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("reso-github-oauth", state, { httpOnly: true, sameSite: "lax",
    secure: new URL(callback).protocol === "https:", path: "/api/connectors/github", maxAge: 600 });
  return res;
}
