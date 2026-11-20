import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return ["/", "/privacy", "/terms"].map(path => ({ url: new URL(path, origin).href }));
}
