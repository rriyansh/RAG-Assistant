import { NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL ?? "http://localhost:8000";
const UPSTREAM_TIMEOUT_MS = 5000;

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const upstreamUrl = new URL("/config/params", BACKEND);

  try {
    const res = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const rawBody = await res.text();
    let data: unknown = null;

    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON response from backend" },
          { status: 502 }
        );
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        typeof data === "object" && data !== null
          ? data
          : { error: `Backend returned status ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data ?? {}, { status: 200 });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");

    return NextResponse.json(
      {
        error: isTimeout
          ? "Backend timed out while fetching configuration parameters"
          : "Unable to reach RAG backend",
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
