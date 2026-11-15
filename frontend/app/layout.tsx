import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG PDF Assistant",
  description:
    "Ask questions about your PDF collection with page-level citations."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-200">{children}</body>
    </html>
  );
}
