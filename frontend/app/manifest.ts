import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Reso Agent", short_name: "Reso Agent",
    description: "Your AI chat and connected workspace.",
    start_url: "/", scope: "/", display: "standalone",
    background_color: "#18151e", theme_color: "#18151e",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
