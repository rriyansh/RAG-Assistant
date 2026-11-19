// components/OnboardingModal.tsx
"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  Globe,
  ImagePlus,
  Layers,
  ShieldCheck,
  Sparkles,
  Type,
  UserRound,
} from "lucide-react";
import { FontId, UserProfile } from "../lib/types";
import { DEFAULT_RAG_ASSISTANT_LOGO } from "../lib/utils";
import {
  DEFAULT_RAG_INTEGRATIONS,
  IntegrationShowcase,
} from "./ui/integration-showcase";

export interface OnboardingModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onUploadUserAvatar: (file: File) => Promise<void>;
  onUploadAssistantLogo: (file: File) => Promise<void>;
  onResetAssistantLogo: () => void;
  onComplete: () => void;
  onOpenConnectors?: () => void;
}

const FONT_CHOICES: Array<{
  id: FontId;
  label: string;
  sample: string;
  fontFamily: string;
}> = [
  {
    id: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    sample: "Modern executive clarity",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    sample: "Clean geometric precision",
    fontFamily: "'DM Sans', sans-serif",
  },
  {
    id: "outfit",
    label: "Outfit",
    sample: "Contemporary technical balance",
    fontFamily: "'Outfit', sans-serif",
  },
  {
    id: "open-sans",
    label: "Open Sans",
    sample: "High-legibility research prose",
    fontFamily: "'Open Sans', sans-serif",
  },
  {
    id: "josefin-sans",
    label: "Josefin Sans",
    sample: "Distinctive editorial character",
    fontFamily: "'Josefin Sans', sans-serif",
  },
  {
    id: "system",
    label: "System Native",
    sample: "Platform default UI stack",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
];

export function OnboardingModal({
  isOpen,
  profile,
  onUpdateProfile,
  onUploadUserAvatar,
  onUploadAssistantLogo,
  onResetAssistantLogo,
  onComplete,
  onOpenConnectors,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [useDefaultLogo, setUseDefaultLogo] = useState<boolean>(
    !profile.assistantLogo ||
      profile.assistantLogo === DEFAULT_RAG_ASSISTANT_LOGO
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentLogo =
    profile.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO;

  async function handleCustomLogoUpload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    try {
      await onUploadAssistantLogo(file);
      setUseDefaultLogo(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload custom logo."
      );
    }
  }

  async function handleUserAvatarUpload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    try {
      await onUploadUserAvatar(file);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload user avatar."
      );
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="RAG Assistant Onboarding"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-md sm:p-6"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950/95 text-slate-100 shadow-2xl shadow-black/80">
        {/* Top Progress Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={currentLogo}
              alt="RAG Assistant Logo"
              className="h-9 w-9 rounded-xl border border-indigo-400/30 object-cover"
            />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Workspace Initialization
              </span>
              <h2 className="text-sm font-semibold text-slate-100">
                {profile.assistantName || "RAG Assistant"} Setup
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx as 1 | 2 | 3)}
                className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
                  step === idx
                    ? "bg-indigo-600 text-white"
                    : step > idx
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                {step > idx ? <Check className="h-3.5 w-3.5" /> : idx}
                <span className="hidden sm:inline">
                  {idx === 1
                    ? "Overview"
                    : idx === 2
                    ? "Identity & Logo"
                    : "Integrations"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-slate-950 p-6 sm:flex-row sm:items-center">
                <div className="space-y-2 max-w-xl">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Retrieval-Augmented Agentic Workspace
                  </span>
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Welcome to {profile.assistantName || "RAG Assistant"}
                  </h1>
                  <p className="text-sm leading-relaxed text-slate-300">
                    An enterprise-grade research and execution assistant that combines local document vector search, real-time web verification, and consented service connectors into a single transparent workflow.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-center">
                  <img
                    src={currentLogo}
                    alt="RAG Assistant Emblem"
                    className="h-20 w-20 rounded-2xl object-contain shadow-lg"
                  />
                  <span className="mt-2 text-xs font-semibold text-slate-200">
                    {profile.assistantName || "RAG Assistant"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    v2.1 Agentic Core
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    ChromaDB PDF Retrieval
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Query local PDF repositories with high-precision semantic embeddings and page-level source attribution.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                    <Globe className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    Live Web Verification
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Automatically supplement local documents with current web search results and full-page text extraction.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    Consented App Connectors
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Connect Gmail, Google Drive, GitHub, Notion, and Slack with interactive approval prompts before any sensitive action runs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Personalize Identity, Emblem & Typography
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Configure how your profile and assistant appear alongside every message in the conversation stream.
                </p>
              </div>

              {uploadError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
                  {uploadError}
                </div>
              )}

              {/* Names & User Avatar */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                    <UserRound className="h-4 w-4" />
                    Your Profile Identity
                  </div>
                  <label className="block text-xs text-slate-400">
                    Your Display Name
                    <input
                      type="text"
                      value={profile.name}
                      maxLength={60}
                      placeholder="Enter your name"
                      onChange={(e) =>
                        onUpdateProfile({ name: e.target.value })
                      }
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                    />
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-indigo-600 text-xs font-bold text-white">
                      {profile.avatarDataUrl ? (
                        <img
                          src={profile.avatarDataUrl}
                          alt="User Avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>
                          {(profile.name || "U").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="sr-only"
                        onChange={async (e) => {
                          await handleUserAvatarUpload(e.target.files?.[0]);
                          e.currentTarget.value = "";
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 hover:border-indigo-400/50">
                        <ImagePlus className="h-3.5 w-3.5" />
                        Upload Your Avatar (Optional)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Assistant Name & Logo Choice */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                    <Layers className="h-4 w-4" />
                    Assistant Identity & Emblem
                  </div>
                  <label className="block text-xs text-slate-400">
                    Assistant Name
                    <input
                      type="text"
                      value={profile.assistantName}
                      maxLength={60}
                      placeholder="RAG Assistant"
                      onChange={(e) =>
                        onUpdateProfile({ assistantName: e.target.value })
                      }
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                    />
                  </label>

                  {/* Choose Official RAG Assistant Logo vs Custom Logo */}
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={currentLogo}
                      alt="Assistant Emblem"
                      className="h-11 w-11 shrink-0 rounded-xl border border-indigo-400/40 object-cover"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onResetAssistantLogo();
                          setUseDefaultLogo(true);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          useDefaultLogo
                            ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
                            : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/25"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Use Official Logo
                      </button>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="sr-only"
                          onChange={async (e) => {
                            await handleCustomLogoUpload(e.target.files?.[0]);
                            e.currentTarget.value = "";
                          }}
                        />
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                            !useDefaultLogo
                              ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
                              : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/25"
                          }`}
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          Upload Custom Logo
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Font Selection Grid */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Type className="h-4 w-4" />
                  Interface Typography
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {FONT_CHOICES.map((f) => {
                    const selected = profile.font === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onUpdateProfile({ font: f.id })}
                        style={{ fontFamily: f.fontFamily }}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-indigo-400 bg-indigo-500/15 text-white"
                            : "border-white/10 bg-slate-950/80 text-slate-300 hover:border-white/25"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-xs font-semibold">
                            {f.label}
                          </span>
                          {selected && (
                            <Check className="h-3.5 w-3.5 text-indigo-400" />
                          )}
                        </div>
                        <span className="mt-1 text-[11px] text-slate-400">
                          {f.sample}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <IntegrationShowcase
                title="Connect your ~essential~ workspace tools"
                subtitle="Seamlessly unify local PDF retrieval with Gmail, Google Drive, GitHub, Notion, Slack, and custom webhooks inside a single verifiable assistant."
                illustrationSrc={currentLogo}
                illustrationAlt={`${profile.assistantName} Logo`}
                integrations={DEFAULT_RAG_INTEGRATIONS}
                onSelectIntegration={() => {
                  onComplete();
                  onOpenConnectors?.();
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={onComplete}
            className="text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Skip setup for now
          </button>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-500"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-500"
              >
                <Check className="h-4 w-4" />
                Launch Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingModal;
