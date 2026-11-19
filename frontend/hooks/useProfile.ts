// hooks/useProfile.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { FontId, UserProfile } from "../lib/types";
import { DEFAULT_RAG_ASSISTANT_LOGO } from "../lib/utils";

const PROFILE_STORAGE_KEY = "rag_assistant_user_profile_v2";
const ONBOARDING_STORAGE_KEY = "rag_assistant_onboarded_v2";

export const DEFAULT_PROFILE: UserProfile = {
  name: "Alex Morgan",
  assistantName: "RAG Assistant",
  headline: "Enterprise Knowledge & Connected Workspace Intelligence",
  bodyText:
    "Ask questions across your indexed PDF documents, live web research, and connected services with verifiable citations.",
  font: "plus-jakarta-sans",
  avatarDataUrl: "",
  assistantLogo: DEFAULT_RAG_ASSISTANT_LOGO,
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Please choose an image smaller than 4 MB."));
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
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfile>;
        setProfile({
          ...DEFAULT_PROFILE,
          ...parsed,
          assistantLogo:
            parsed.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO,
        });
      }
      const onboardedFlag = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      setIsOnboarded(onboardedFlag === "true");
    } catch {
      // Fallback to default profile
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
          patch.assistantLogo !== undefined
            ? patch.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO
            : prev.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO,
      };
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    try {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(DEFAULT_PROFILE)
      );
    } catch {
      // Ignore
    }
  }, []);

  const setAvatarFromFile = useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      update({ avatarDataUrl: dataUrl });
    },
    [update]
  );

  const clearAvatar = useCallback(() => {
    update({ avatarDataUrl: "" });
  }, [update]);

  const setAssistantLogoFromFile = useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      update({ assistantLogo: dataUrl });
    },
    [update]
  );

  const clearAssistantLogo = useCallback(() => {
    update({ assistantLogo: DEFAULT_RAG_ASSISTANT_LOGO });
  }, [update]);

  const completeOnboarding = useCallback(() => {
    setIsOnboarded(true);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // Ignore
    }
  }, []);

  const reopenOnboarding = useCallback(() => {
    setIsOnboarded(false);
  }, []);

  return {
    profile,
    assistantName: profile.assistantName || "RAG Assistant",
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
