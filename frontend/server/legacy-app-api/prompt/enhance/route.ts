import { backendFetch } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const MAX_BODY_BYTES = 64 * 1024; // 64 KB limit for prompt enhancement payloads
const UPSTREAM_TIMEOUT_MS = 25_000;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  if (!rawBody.trim()) {
    return NextResponse.json(
      { error: "Request body cannot be empty" },
      { status: 400 }
    );
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Prompt payload exceeds maximum allowed size" },
      { status: 413 }
    );
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (typeof parsedPayload !== "object" || parsedPayload === null || Array.isArray(parsedPayload)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL("/prompt/enhance", BACKEND);
  const timeoutSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  const combinedSignal =
    typeof AbortSignal.any === "function"
      ? AbortSignal.any([req.signal, timeoutSignal])
      : timeoutSignal;

  try {
    const res = await backendFetch(upstreamUrl.toString(), {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(parsedPayload),
      signal: combinedSignal,
    });

    const responseText = await res.text();
    let data: unknown = null;

    if (responseText) {
      try {
        data = JSON.parse(responseText);
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
    if (req.signal.aborted) {
      return NextResponse.json(
        { error: "Request cancelled by client" },
        { status: 499 }
      );
    }

    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");

    return NextResponse.json(
      {
        error: isTimeout
          ? "Backend timed out while enhancing prompt"
          : "Unable to reach RAG backend",
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
