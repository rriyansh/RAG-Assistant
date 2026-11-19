"use client";

import React, { useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { FontId, UserProfile } from "../lib/types";
import {
  DEFAULT_RAG_ASSISTANT_LOGO,
  INBUILT_ASSISTANT_LOGOS,
  INBUILT_USER_PFPS,
} from "../lib/utils";

export interface OnboardingModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onUploadUserAvatar: (file: File) => Promise<void>;
  onUploadAssistantLogo: (file: File) => Promise<void>;
  onResetAssistantLogo: () => void;
  onComplete: () => void;
}

const FONT_OPTIONS: Array<{ id: FontId; label: string; family: string }> = [
  { id: "open-sans", label: "Open Sans (Default)", family: "'Open Sans', sans-serif" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', sans-serif" },
  { id: "dm-sans", label: "DM Sans", family: "'DM Sans', sans-serif" },
  { id: "outfit", label: "Outfit", family: "'Outfit', sans-serif" },
  { id: "josefin-sans", label: "Josefin Sans", family: "'Josefin Sans', sans-serif" },
  { id: "system", label: "System Default", family: "system-ui, sans-serif" },
];

export function OnboardingModal({
  isOpen,
  profile,
  onUpdateProfile,
  onUploadUserAvatar,
  onUploadAssistantLogo,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const currentLogo = profile.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO;
  const currentAvatar = profile.avatarDataUrl || INBUILT_USER_PFPS[0].url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ fontFamily: "'Open Sans', sans-serif" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0c0e]/75 p-4 backdrop-blur-md"
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#e6e4f0]/15 bg-[#141417] text-[#f4f3f8] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e6e4f0]/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={currentLogo}
              alt="Logo"
              className="h-9 w-9 rounded-xl border border-[#e6e4f0]/20 object-cover"
            />
            <span className="text-sm font-semibold tracking-tight text-[#f4f3f8]">
              {profile.assistantName || "RAG Assistant"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                step === 1
                  ? "bg-[#f4f3f8] text-[#0c0c0e]"
                  : "bg-[#1c1c21] text-[#e6e4f0]/70"
              }`}
            >
              1. Profile
            </span>
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                step === 2
                  ? "bg-[#f4f3f8] text-[#0c0c0e]"
                  : "bg-[#1c1c21] text-[#e6e4f0]/70"
              }`}
            >
              2. Assistant
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#e6e4f0]/80">
                  Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  placeholder=""
                  onChange={(e) => onUpdateProfile({ name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3.5 py-2.5 text-sm text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#e6e4f0]/80">
                    Inbuilt PFP
                  </span>
                  <label className="cursor-pointer text-xs text-[#e6e4f0]/70 hover:text-[#f4f3f8]">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await onUploadUserAvatar(file);
                      }}
                    />
                    <span className="inline-flex items-center gap-1">
                      <ImagePlus className="h-3.5 w-3.5" /> Custom Upload
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-6 gap-2.5">
                  {INBUILT_USER_PFPS.map((pfp) => {
                    const active = currentAvatar === pfp.url;
                    return (
                      <button
                        key={pfp.id}
                        type="button"
                        onClick={() => onUpdateProfile({ avatarDataUrl: pfp.url })}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition ${
                          active
                            ? "border-[#f4f3f8] bg-[#1c1c21]"
                            : "border-[#e6e4f0]/10 bg-[#0c0c0e] hover:border-[#e6e4f0]/30"
                        }`}
                      >
                        <img
                          src={pfp.url}
                          alt={pfp.label}
                          className="h-11 w-11 rounded-xl object-cover"
                        />
                        <span className="text-[10px] text-[#e6e4f0]/80">
                          {pfp.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#e6e4f0]/80">
                  Interface Font
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      style={{ fontFamily: f.family }}
                      onClick={() => onUpdateProfile({ font: f.id })}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition ${
                        profile.font === f.id
                          ? "border-[#f4f3f8] bg-[#1c1c21] text-[#f4f3f8] font-semibold"
                          : "border-[#e6e4f0]/10 bg-[#0c0c0e] text-[#e6e4f0]/75 hover:border-[#e6e4f0]/30"
                      }`}
                    >
                      <span className="truncate">{f.label}</span>
                      {profile.font === f.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#e6e4f0]/80">
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={profile.assistantName}
                  onChange={(e) => onUpdateProfile({ assistantName: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3.5 py-2.5 text-sm text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#e6e4f0]/80">
                    Assistant Logo
                  </span>
                  <label className="cursor-pointer text-xs text-[#e6e4f0]/70 hover:text-[#f4f3f8]">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await onUploadAssistantLogo(file);
                      }}
                    />
                    <span className="inline-flex items-center gap-1">
                      <ImagePlus className="h-3.5 w-3.5" /> Upload Custom Logo
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {INBUILT_ASSISTANT_LOGOS.map((item) => {
                    const selected = currentLogo === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onUpdateProfile({ assistantLogo: item.url })}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition ${
                          selected
                            ? "border-[#f4f3f8] bg-[#1c1c21]"
                            : "border-[#e6e4f0]/10 bg-[#0c0c0e] hover:border-[#e6e4f0]/30"
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="h-12 w-12 rounded-xl object-contain"
                        />
                        <span className="text-[11px] font-medium text-[#e6e4f0]">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#e6e4f0]/10 bg-[#0c0c0e] px-6 py-4">
          <button
            type="button"
            onClick={onComplete}
            className="text-xs text-[#e6e4f0]/60 hover:text-[#f4f3f8]"
          >
            Skip
          </button>
          <div className="flex items-center gap-2.5">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-[#e6e4f0]/20 bg-[#141417] px-4 py-2 text-xs font-medium text-[#f4f3f8]"
              >
                Back
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl bg-[#f4f3f8] px-5 py-2 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] active:translate-y-[1px]"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                className="rounded-xl bg-[#f4f3f8] px-5 py-2 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] active:translate-y-[1px]"
              >
                Start Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingModal;
