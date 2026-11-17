import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Assistant",
  description: "Ask anything silent, take response smartly",
};

const fontScript = `
try {
  var raw = localStorage.getItem("rag.profile");
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
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: fontScript }} />
      </head>
      <body className="min-h-screen bg-surface text-gray-200">{children}</body>
    </html>
  );
}
