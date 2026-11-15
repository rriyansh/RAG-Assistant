"use client";

import { Trash2 } from "lucide-react";
import { Logo } from "./Logo";

interface HeaderProps {
  onClear: () => void;
  canClear: boolean;
}

export function Header({ onClear, canClear }: HeaderProps): JSX.Element {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo
            size={36}
            href="https://chatgpt.com/s/t_6af9d892f9b48191a7f8f71054589998"
            external
          />
          <div className="min-w-0">
            <h1 className="font-display truncate text-[15px] font-semibold tracking-tight text-gray-100">
              RAG Assistant
            </h1>
            <p className="truncate text-xs text-gray-400">
              Ask questions from your documents
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-gray-300 transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={14} />
          Clear
        </button>
      </div>
    </header>
  );
}
