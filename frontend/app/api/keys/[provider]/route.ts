import { backendFetch } from "@/lib/backend";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RAG_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const UPSTREAM_TIMEOUT_MS = 5000;
const PROVIDER_SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ provider: string }> | { provider: string };
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { provider: rawProvider } = await Promise.resolve(context.params);
  const provider = rawProvider?.trim() ?? "";

  if (!PROVIDER_SLUG_RE.test(provider)) {
    return NextResponse.json(
      { error: "Invalid provider identifier" },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL(`/keys/${encodeURIComponent(provider)}`, BACKEND);

  try {
    const res = await backendFetch(upstreamUrl.toString(), {
      method: "DELETE",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (res.status === 204) {
      return NextResponse.json({ ok: true, provider }, { status: 200 });
    }

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

    return NextResponse.json(data ?? { ok: true, provider }, { status: 200 });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");

    return NextResponse.json(
      {
        error: isTimeout
          ? "Backend timed out while removing API key"
          : "Unable to reach RAG backend",
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
