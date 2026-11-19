"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

interface AvatarProps {
  profile: UserProfile;
  size?: number;
  className?: string;
}

export function Avatar({ profile, size = 32, className }: AvatarProps): JSX.Element {
  const style = { width: size, height: size };

  if (profile.avatarDataUrl) {
    return (
      <img
        src={profile.avatarDataUrl}
        alt={profile.name}
        style={style}
        className={cn("rounded-full object-cover border border-white/10", className)}
      />
    );
  }

  const initial = profile.name.trim().charAt(0).toUpperCase();
  if (initial) {
    return (
      <div
        style={style}
        className={cn(
          "flex items-center justify-center rounded-full bg-accent text-white text-xs font-semibold border border-white/10",
          className
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(
        "flex items-center justify-center rounded-full bg-accent text-white border border-white/10",
        className
      )}
    >
      <User size={Math.round(size * 0.55)} />
    </div>
  );
}
