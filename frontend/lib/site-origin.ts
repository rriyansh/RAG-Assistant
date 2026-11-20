import { headers } from "next/headers";

export function siteOrigin(): URL {
  if (process.env.SITE_URL) return new URL(new URL(process.env.SITE_URL).origin);
  const incoming = headers();
  const host = incoming.get("x-forwarded-host")?.split(",")[0]?.trim() || incoming.get("host");
  if (!host) throw new Error("Set SITE_URL when serving without a Host header.");
  const protocol = incoming.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return new URL(`${protocol === "http" ? "http" : "https"}://${host}`);
}
