"use client";

import { useCallback, useEffect, useState } from "react";
import { FontId, UserProfile } from "../lib/types";
import { DEFAULT_RAG_ASSISTANT_LOGO, LEGACY_ASSISTANT_LOGO, INBUILT_USER_PFPS } from "../lib/utils";

const PROFILE_STORAGE_KEY = "rag_assistant_user_profile_v4";
const LEGACY_KEYS = [
  "rag_assistant_user_profile_v3",
  "rag_assistant_user_profile_v2",
  "rag_assistant_user_profile_v1",
  "rag_assistant_profile",
  "user_profile",
];
const ONBOARDING_STORAGE_KEY = "rag_assistant_onboarded_v4";

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  assistantName: "Reso Agent",
  headline: "Grounded Knowledge & Code Synthesis",
  bodyText: "Search documents, connect workspace tools, and generate code or documents.",
  font: "plus-jakarta-sans",
  avatarDataUrl: INBUILT_USER_PFPS[0]!.url,
  assistantLogo: DEFAULT_RAG_ASSISTANT_LOGO,
};

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Image must be smaller than 4 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      let savedLogo: string | undefined;
      let savedAvatar: string | undefined;
      for (const k of [PROFILE_STORAGE_KEY, ...LEGACY_KEYS]) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<UserProfile>;
          if (parsed.assistantLogo !== undefined && savedLogo === undefined) {
            savedLogo = parsed.assistantLogo === LEGACY_ASSISTANT_LOGO ? DEFAULT_RAG_ASSISTANT_LOGO : parsed.assistantLogo;
          }
          if (parsed.avatarDataUrl && !savedAvatar) {
            savedAvatar = parsed.avatarDataUrl;
          }
        }
      }

      const currentRaw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (currentRaw) {
        const parsed = JSON.parse(currentRaw) as Partial<UserProfile>;
        setProfile({
          ...DEFAULT_PROFILE,
          ...parsed,
          assistantName: parsed.assistantName || "Reso Agent",
          font: (parsed.font as FontId) || "plus-jakarta-sans",
          avatarDataUrl: parsed.avatarDataUrl || savedAvatar || INBUILT_USER_PFPS[0]!.url,
          assistantLogo: savedLogo ?? DEFAULT_RAG_ASSISTANT_LOGO,
        });
      } else if (savedLogo !== undefined || savedAvatar) {
        setProfile((prev) => ({
          ...prev,
          avatarDataUrl: savedAvatar || prev.avatarDataUrl,
          assistantLogo: savedLogo !== undefined ? savedLogo : prev.assistantLogo,
        }));
      }

      const onboardedFlag = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      setIsOnboarded(onboardedFlag === "true");
    } catch {
      setIsOnboarded(false);
    } finally {
      setHydrated(true);
    }
  }, []);

  const update = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next: UserProfile = {
        ...prev,
        ...patch,
        assistantLogo:
          patch.assistantLogo !== undefined ? patch.assistantLogo : prev.assistantLogo,
      };
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE));
    } catch {}
  }, []);

  const setAvatarFromFile = useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      update({ avatarDataUrl: dataUrl });
    },
    [update]
  );

  const clearAvatar = useCallback(() => {
    update({ avatarDataUrl: INBUILT_USER_PFPS[0]!.url });
  }, [update]);

  const setAssistantLogoFromFile = useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      update({ assistantLogo: dataUrl });
    },
    [update]
  );

  const clearAssistantLogo = useCallback(() => {
    update({ assistantLogo: "" });
  }, [update]);

  const completeOnboarding = useCallback(() => {
    setIsOnboarded(true);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {}
  }, []);

  const reopenOnboarding = useCallback(() => {
    setIsOnboarded(false);
  }, []);

  return {
    profile,
    assistantName: profile.assistantName || "Reso Agent",
    isOnboarded,
    hydrated,
    update,
    reset,
    setAvatarFromFile,
    clearAvatar,
    setAssistantLogoFromFile,
    clearAssistantLogo,
    completeOnboarding,
    reopenOnboarding,
  };
}

export default useProfile;
