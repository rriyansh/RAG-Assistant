import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Assistant",
  description: "Ask questions about your PDFs with page-level citations.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..700&family=Josefin+Sans:wght@300..700&family=Fredoka:wght@300..700&family=Open+Sans:wght@300..700&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:wght@200..800&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: fontScript }} />
      </head>
      <body className="min-h-screen bg-surface text-gray-200">{children}</body>
    </html>
  );
}
