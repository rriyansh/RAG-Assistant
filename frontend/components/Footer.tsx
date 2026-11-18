import Link from "next/link";

export function Footer(): JSX.Element {
  return (
    <footer className="border-t border-border bg-[#0b0f14]/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[11px] text-gray-500">
        <span>© {new Date().getFullYear()} RAG Assistant · MIT License</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
