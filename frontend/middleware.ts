import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.cookies.get("reso-session")?.value.match(/^[a-f0-9]{32}$/)) {
    return NextResponse.next();
  }
  const session = crypto.randomUUID().replaceAll("-", "");
  request.cookies.set("reso-session", session);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set("reso-session", session, {
    httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:",
    path: "/", maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}

export const config = { matcher: ["/", "/settings/:path*", "/api/:path*"] };
