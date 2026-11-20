"use client";

import { Settings, Trash2 } from "lucide-react";

interface HeaderProps {
  onClear: () => void;
  onOpenSettings: () => void;
  canClear: boolean;
}

export function Header({ onClear, onOpenSettings, canClear }: HeaderProps) {
  const buttonStyle = "grid h-11 w-11 place-items-center rounded-full text-gray-300 hover:bg-panel focus-visible:outline";
  return (
    <header className="mx-auto flex w-full max-w-3xl justify-end gap-1 px-3 py-1">
      <button type="button" aria-label="Settings" title="Settings" className={buttonStyle} onClick={onOpenSettings}>
        <Settings size={18} />
      </button>
      {canClear && (
        <button type="button" aria-label="Clear chat" title="Clear chat" className={buttonStyle} onClick={onClear}>
          <Trash2 size={18} />
        </button>
      )}
    </header>
  );
}
