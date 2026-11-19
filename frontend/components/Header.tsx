"use client";

import { Trash2, Settings } from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { useProfile } from "@/hooks/useProfile";

interface HeaderProps {
  onClear: () => void;
  onOpenSettings: () => void;
  canClear: boolean;
}

export function Header({ onClear, onOpenSettings, canClear }: HeaderProps): JSX.Element {
  const { profile } = useProfile();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size={36} src={profile.assistantLogo || "/logo.svg"} />
          <div className="min-w-0">
            <h1 className="font-display truncate text-[15px] font-semibold tracking-tight text-gray-100">
              {profile.assistantName}
            </h1>
            <p className="truncate text-xs text-gray-400">{profile.headline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 pr-1">
            <Avatar profile={profile} size={30} />
            <span className="hidden max-w-24 truncate text-xs text-gray-300 sm:block">
              {profile.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-gray-300 transition hover:bg-panel"
          >
            <Settings size={14} /> Settings
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!canClear}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-gray-300 transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>
    </header>
  );
}
