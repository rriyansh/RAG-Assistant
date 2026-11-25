import type { Metadata } from "next";
import "./globals.css";
import { RegisterApp } from "@/components/RegisterApp";
import { UpdaterReady } from "@/lib/UpdaterReady";
import { BackendMonitor } from "@/lib/BackendMonitor";
import { siteOrigin } from "@/lib/site-origin";

export function generateMetadata(): Metadata {
  const title = "Reso Agent";
  const description = "Find answers in your documents, write code, and work with your connected apps in one conversation.";
  const image = { url: "/reso-preview.jpg", width: 1200, height: 630, alt: "Reso Agent" };
  return {
    metadataBase: siteOrigin(),
    title, description, manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg", apple: "/app-icon-192.png" },
    appleWebApp: { capable: true, title },
    openGraph: { type: "website", siteName: title, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

const fontScript = `
try {
  var raw = localStorage.getItem("rag_assistant_user_profile_v4");
  if (raw) {
    var p = JSON.parse(raw);
    if (p && typeof p.font === "string") {
      document.documentElement.dataset.font = p.font;
    }
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..700&family=Josefin+Sans:wght@300..700&family=Fredoka:wght@300..700&family=Open+Sans:wght@300..700&family=Outfit:wght@100..900&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: fontScript }} />
      </head>
      <body className="min-h-screen bg-surface text-gray-200">{children}</body>
        <RegisterApp />
        <UpdaterReady />
        <BackendMonitor />
    </html>
  );
}
