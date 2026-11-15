"use client";

import { MessageSquare, Trash2 } from "lucide-react";

interface HeaderProps {
  onClear: () => void;
  canClear: boolean;
}

export function Header({ onClear, canClear }: HeaderProps): JSX.Element {
  return (
    <header className="border-b border-border bg-panel/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-accent/15 p-2 text-accent">
            <MessageSquare size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-100">
              RAG PDF Assistant
            </h1>
            <p className="text-xs text-gray-400">
              Ask questions from your documents
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-gray-300 hover:bg-panel disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Trash2 size={14} />
          Clear
        </button>
      </div>
    </header>
  );
}
