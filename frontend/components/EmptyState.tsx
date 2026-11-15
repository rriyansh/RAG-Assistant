"use client";

import { Sparkles } from "lucide-react";

export function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-[#a9dcff] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
        <Sparkles size={22} />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-gray-100">
        Ask about your documents
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-gray-400">
        Answers are grounded in your PDFs and come with page-level citations.
      </p>
    </div>
  );
}
