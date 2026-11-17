"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

const KEY = "rag.profile";
const EMPTY: Profile = { name: "You", avatarDataUrl: "" };

function read(): Profile {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      name: parsed.name?.trim() || EMPTY.name,
      avatarDataUrl: parsed.avatarDataUrl || "",
    };
  } catch {
    return EMPTY;
  }
}

function write(p: Profile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  // Notify other components listening for profile changes.
  window.dispatchEvent(new CustomEvent("rag:profile"));
}

export interface UseProfileResult {
  profile: Profile;
  setName: (name: string) => void;
  setAvatarFromFile: (file: File) => Promise<void>;
  clearAvatar: () => void;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile>(EMPTY);

  useEffect(() => {
    setProfile(read());
    const on = (): void => setProfile(read());
    window.addEventListener("rag:profile", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("rag:profile", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const setName = useCallback((name: string): void => {
    const next = { ...read(), name: name.trim() || EMPTY.name };
    write(next);
    setProfile(next);
  }, []);

  const setAvatarFromFile = useCallback(async (file: File): Promise<void> => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file");
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Image must be smaller than 2 MB");
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    const next = { ...read(), avatarDataUrl: dataUrl };
    write(next);
    setProfile(next);
  }, []);

  const clearAvatar = useCallback((): void => {
    const next = { ...read(), avatarDataUrl: "" };
    write(next);
    setProfile(next);
  }, []);

  return { profile, setName, setAvatarFromFile, clearAvatar };
}
