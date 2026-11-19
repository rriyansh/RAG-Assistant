"use client";

import React, { useState } from "react";
import { Header } from "../components/Header";
import { ChatMessage } from "../components/ChatMessage";
import ChatComposer from "../components/ChatComposer";
import { SettingsModal } from "../components/SettingsModal";
import { OnboardingModal } from "../components/OnboardingModal";
import { useChat } from "../hooks/useChat";
import { useProfile } from "../hooks/useProfile";
import { DEFAULT_RAG_ASSISTANT_LOGO } from "../lib/utils";
import { Code2, Plug } from "lucide-react";

const FONT_STACK_MAP: Record<string, string> = {
  "open-sans": "'Open Sans', system-ui, sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  "dm-sans": "'DM Sans', system-ui, sans-serif",
  "josefin-sans": "'Josefin Sans', system-ui, sans-serif",
  fredoka: "'Fredoka', system-ui, sans-serif",
  outfit: "'Outfit', system-ui, sans-serif",
  "plus-jakarta-sans": "'Plus Jakarta Sans', system-ui, sans-serif",
};

const QUICK_BUILDER_ACTIONS = [
  {
    label: "Create Python Script (.py)",
    prompt:
      "Write a clean, well-structured Python script with a filename comment at the top so I can download it directly.",
  },
  {
    label: "Create C Program (.c)",
    prompt:
      "Write a complete, compilable C program with a filename comment at the top so I can download the .c file.",
  },
  {
    label: "Generate PDF / DOC Report",
    prompt:
      "Draft a structured executive report from my knowledge base that I can export as a PDF or Word document.",
  },
  {
    label: "Search Connected Workspace",
    prompt:
      "Search my indexed PDFs, GitHub repositories, or connected Google Drive files for recent updates.",
  },
];

export default function HomePage() {
  const profileState = useProfile();
  const {
    profile,
    assistantName,
    isOnboarded,
    hydrated,
    update: updateProfile,
    setAvatarFromFile,
    setAssistantLogoFromFile,
    clearAssistantLogo,
    completeOnboarding,
    reopenOnboarding,
  } = profileState;

  const {
    messages,
    isLoading,
    sendMessage,
    approveToolConsent,
    denyToolConsent,
    clearMessages,
  } = useChat(assistantName);

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);


  const handleSend = (text: string) => {
    const query = text.trim();
    if (!query) return;
    sendMessage(query);
  };

  const showOnboarding = hydrated && !isOnboarded;
  const activeFontFamily =
    FONT_STACK_MAP[profile.font] || FONT_STACK_MAP["plus-jakarta-sans"];
  React.useEffect(() => {
    if (hydrated) document.documentElement.dataset.font = profile.font;
  }, [hydrated, profile.font]);
  const hasLogo = profile.assistantLogo !== "";
  const assistantLogoSrc =
    profile.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO;

  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div
      style={{ fontFamily: activeFontFamily }}
      className="relative flex h-[100dvh] flex-col bg-[#0c0c0e] text-[#f4f3f8] antialiased"
    >
      <div
        className={`flex h-full flex-col transition-all duration-300 ${
          showOnboarding
            ? "pointer-events-none select-none blur-[6px] brightness-75"
            : ""
        }`}
      >
        <Header
            profile={profile}
            canClear={messages.length > 0}
            onOpenSettings={() => setSettingsOpen(true)}
            onClear={clearMessages}
          />

        <main className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {messages.length === 0 ? (
              <div className="mt-6 space-y-6 sm:mt-10">
                <div className="text-center space-y-1.5 py-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-[#f4f3f8] sm:text-3xl">
                    Welcome to Reso, How can I help you?
                  </h2>
                </div>

                <div className="rounded-3xl border border-[#e6e4f0]/15 bg-[#141417] p-5 sm:p-8">
                  <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4 min-w-0">
                      {hasLogo && (
                        <img
                          src={assistantLogoSrc}
                          alt={assistantName}
                          className="h-14 w-14 shrink-0 rounded-2xl border border-[#e6e4f0]/20 object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#e6e4f0]/60">
                          RAG Assistant
                        </div>
                        <h1 className="break-words text-lg font-bold tracking-tight text-[#f4f3f8] sm:text-xl">
                          {profile.headline || "Grounded Knowledge & Code Synthesis"}
                        </h1>
                        <p className="mt-1 text-xs leading-relaxed text-[#e6e4f0]/70">
                          {profile.bodyText ||
                            "Search documents, connect workspace tools, and generate code or documents."}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={reopenOnboarding}
                        className="rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3.5 py-2 text-xs font-medium text-[#e6e4f0] transition hover:border-[#f4f3f8]"
                      >
                        Onboarding
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#f4f3f8] px-4 py-2 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] active:translate-y-[1px]"
                      >
                        <Plug className="h-3.5 w-3.5" />
                        Connectors & Settings
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {QUICK_BUILDER_ACTIONS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        className="flex items-center justify-between rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] px-4 py-3 text-left text-xs font-medium text-[#f4f3f8] transition hover:border-[#f4f3f8]"
                      >
                        <span className="truncate pr-2">{item.label}</span>
                        <Code2 className="h-4 w-4 shrink-0 text-[#e6e4f0]/60" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  profile={profile}
                  assistantName={assistantName}
                  isLatestAssistant={index === lastAssistantIndex}
                  isLoading={isLoading}
                  onApproveConsent={approveToolConsent}
                  onDenyConsent={denyToolConsent}
                />
              ))
            )}
          </div>
        </main>

        <div className="border-t border-[#e6e4f0]/10 bg-[#0c0c0e] px-3 py-3 sm:px-4">
          <div className="mx-auto w-full max-w-3xl">
            <ChatComposer onSubmit={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingModal
        isOpen={showOnboarding}
        profile={profile}
        onUpdateProfile={updateProfile}
        onUploadUserAvatar={setAvatarFromFile}
        onUploadAssistantLogo={setAssistantLogoFromFile}
        onResetAssistantLogo={clearAssistantLogo}
        onComplete={completeOnboarding}
      />}

      <SettingsModal
          profileState={profileState}
          isOpen={settingsOpen}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
    </div>
  );
}
