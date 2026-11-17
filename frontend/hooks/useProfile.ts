"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile, FontId } from "@/lib/types";

const KEY = "rag.profile";

const DEFAULTS: Profile = {
  name: "You",
  avatarDataUrl: "",
  assistantName: "RAG Assistant",
  assistantLogo: "",
  headline: "Ask questions from your documents",
  bodyText: "Answers are grounded in your PDFs and come with page-level citations.",
  font: "dm-sans",
};

const VALID_FONTS: FontId[] = [
  "system", "dm-sans", "josefin-sans", "fredoka",
  "open-sans", "outfit", "plus-jakarta-sans",
];

function read(): Profile {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    const font = VALID_FONTS.includes(parsed.font as FontId)
      ? (parsed.font as FontId)
      : DEFAULTS.font;
    return {
      name: parsed.name?.trim() || DEFAULTS.name,
      avatarDataUrl: parsed.avatarDataUrl || DEFAULTS.avatarDataUrl,
      assistantName: parsed.assistantName?.trim() || DEFAULTS.assistantName,
      assistantLogo: parsed.assistantLogo || DEFAULTS.assistantLogo,
      headline: parsed.headline?.trim() || DEFAULTS.headline,
      bodyText: parsed.bodyText?.trim() || DEFAULTS.bodyText,
      font,
    };
  } catch {
    return DEFAULTS;
  }
}

function write(p: Profile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("rag:profile"));
}

export interface UseProfileResult {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  setName: (v: string) => void;
  setAvatarFromFile: (file: File) => Promise<void>;
  clearAvatar: () => void;
  setAssistantLogoFromFile: (file: File) => Promise<void>;
  clearAssistantLogo: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 2 * 1024 * 1024) throw new Error("Image must be under 2 MB");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile>(DEFAULTS);

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

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.font = profile.font;
  }, [profile.font]);

  const update = useCallback((patch: Partial<Profile>): void => {
    const next = { ...read(), ...patch };
    write(next);
    setProfile(next);
  }, []);

  const setName = useCallback((v: string): void => {
    update({ name: v.trim() || DEFAULTS.name });
  }, [update]);

  const setAvatarFromFile = useCallback(async (file: File): Promise<void> => {
    const dataUrl = await readFileAsDataUrl(file);
    update({ avatarDataUrl: dataUrl });
  }, [update]);

  const clearAvatar = useCallback((): void => {
    update({ avatarDataUrl: "" });
  }, [update]);

  const setAssistantLogoFromFile = useCallback(async (file: File): Promise<void> => {
    const dataUrl = await readFileAsDataUrl(file);
    update({ assistantLogo: dataUrl });
  }, [update]);

  const clearAssistantLogo = useCallback((): void => {
    update({ assistantLogo: "" });
  }, [update]);

  return { profile, update, setName, setAvatarFromFile, clearAvatar, setAssistantLogoFromFile, clearAssistantLogo };
}
