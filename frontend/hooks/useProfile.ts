"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile, FontId } from "@/lib/types";

const KEY = "rag.profile";
const EVENT_NAME = "rag:profile";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

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
  "system",
  "dm-sans",
  "josefin-sans",
  "fredoka",
  "open-sans",
  "outfit",
  "plus-jakarta-sans",
];

function sanitizeImageDataUrl(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  // Allow standard raster image data URLs; disallow SVG data URLs to prevent embedded scripts
  if (/^data:image\/(png|jpe?g|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon);base64,/i.test(value)) {
    return value;
  }
  return "";
}

function read(): Profile {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return DEFAULTS;
    }

    const record = parsed as Partial<Profile>;
    const font = VALID_FONTS.includes(record.font as FontId)
      ? (record.font as FontId)
      : DEFAULTS.font;

    return {
      name: typeof record.name === "string" ? record.name : DEFAULTS.name,
      avatarDataUrl: sanitizeImageDataUrl(record.avatarDataUrl),
      assistantName:
        typeof record.assistantName === "string"
          ? record.assistantName
          : DEFAULTS.assistantName,
      assistantLogo: sanitizeImageDataUrl(record.assistantLogo),
      headline:
        typeof record.headline === "string" ? record.headline : DEFAULTS.headline,
      bodyText:
        typeof record.bodyText === "string" ? record.bodyText : DEFAULTS.bodyText,
      font,
    };
  } catch {
    return DEFAULTS;
  }
}

function write(p: Profile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    throw new Error("Browser storage is full. Please choose a smaller image.");
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export interface UseProfileResult {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  reset: () => void;
  setName: (v: string) => void;
  setAvatarFromFile: (file: File) => Promise<void>;
  clearAvatar: () => void;
  setAssistantLogoFromFile: (file: File) => Promise<void>;
  clearAssistantLogo: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Please choose a PNG, JPG, WebP, or GIF image");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 2 MB");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (!sanitizeImageDataUrl(result)) {
        reject(new Error("Unsupported image format"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile>(DEFAULTS);

  useEffect(() => {
    setProfile(read());

    const syncLocal = (): void => setProfile(read());
    const syncStorage = (e: StorageEvent): void => {
      if (e.key === null || e.key === KEY) {
        setProfile(read());
      }
    };

    window.addEventListener(EVENT_NAME, syncLocal);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, syncLocal);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.font = profile.font;
  }, [profile.font]);

  const update = useCallback((patch: Partial<Profile>): void => {
    const current = read();
    const next: Profile = {
      ...current,
      ...patch,
      font:
        patch.font !== undefined && VALID_FONTS.includes(patch.font)
          ? patch.font
          : current.font,
      avatarDataUrl:
        patch.avatarDataUrl !== undefined
          ? sanitizeImageDataUrl(patch.avatarDataUrl)
          : current.avatarDataUrl,
      assistantLogo:
        patch.assistantLogo !== undefined
          ? sanitizeImageDataUrl(patch.assistantLogo)
          : current.assistantLogo,
    };
    write(next);
    setProfile(next);
  }, []);

  const reset = useCallback((): void => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(KEY);
      } catch {
        // Ignore storage access errors
      }
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
    setProfile(DEFAULTS);
  }, []);

  const setName = useCallback(
    (v: string): void => {
      update({ name: v.trim() || DEFAULTS.name });
    },
    [update]
  );

  const setAvatarFromFile = useCallback(
    async (file: File): Promise<void> => {
      const dataUrl = await readFileAsDataUrl(file);
      update({ avatarDataUrl: dataUrl });
    },
    [update]
  );

  const clearAvatar = useCallback((): void => {
    update({ avatarDataUrl: "" });
  }, [update]);

  const setAssistantLogoFromFile = useCallback(
    async (file: File): Promise<void> => {
      const dataUrl = await readFileAsDataUrl(file);
      update({ assistantLogo: dataUrl });
    },
    [update]
  );

  const clearAssistantLogo = useCallback((): void => {
    update({ assistantLogo: "" });
  }, [update]);

  return {
    profile,
    update,
    reset,
    setName,
    setAvatarFromFile,
    clearAvatar,
    setAssistantLogoFromFile,
    clearAssistantLogo,
  };
}
