import { backendFetch } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const HEALTH_TIMEOUT_MS = 3000;

interface BackendHealthPayload {
  status?: unknown;
  [key: string]: unknown;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const strict = req.nextUrl.searchParams.get("strict") === "1";
  const healthUrl = new URL("/health", BACKEND_URL);
  const startedAt = performance.now();

  try {
    const res = await backendFetch(healthUrl.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });

    const latencyMs = Math.round(performance.now() - startedAt);

    if (!res.ok) {
      return NextResponse.json(
        {
          status: "degraded",
          backend: res.status,
          latencyMs,
          timestamp: new Date().toISOString(),
        },
        { status: strict ? 503 : 200 }
      );
    }

    const rawBody = await res.text();
    let data: BackendHealthPayload = {};

    if (rawBody) {
      try {
        const parsed: unknown = JSON.parse(rawBody);
        if (typeof parsed === "object" && parsed !== null) {
          data = parsed as BackendHealthPayload;
        }
      } catch {
        return NextResponse.json(
          {
            status: "degraded",
            backend: "invalid-json",
            latencyMs,
            timestamp: new Date().toISOString(),
          },
          { status: strict ? 503 : 200 }
        );
      }
    }

    const backendStatus =
      typeof data.status === "string" && data.status.trim()
        ? data.status
        : "ok";
    const isHealthy = backendStatus.toLowerCase() === "ok";

    return NextResponse.json(
      {
        status: isHealthy ? "ok" : "degraded",
        backend: backendStatus,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: strict && !isHealthy ? 503 : 200 }
    );
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    const message = isTimeout
      ? `Backend health check timed out after ${HEALTH_TIMEOUT_MS}ms`
      : err instanceof Error
        ? err.message
        : "Unknown error";

    return NextResponse.json(
      {
        status: "unreachable",
        error: message,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: strict ? 503 : 200 }
    );
  }
}
