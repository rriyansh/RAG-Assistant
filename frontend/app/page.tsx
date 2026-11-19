// app/page.tsx
"use client";

import React, { useState } from "react";
import * as HeaderMod from "../components/Header";
import * as ChatMessageMod from "../components/ChatMessage";
import * as ChatComposerMod from "../components/ChatComposer";
import * as SettingsModalMod from "../components/SettingsModal";
import { OnboardingModal } from "../components/OnboardingModal";
import {
  DEFAULT_RAG_INTEGRATIONS,
  IntegrationShowcase,
} from "../components/ui/integration-showcase";
import { useChat } from "../hooks/useChat";
import { useProfile } from "../hooks/useProfile";
import { DEFAULT_RAG_ASSISTANT_LOGO } from "../lib/utils";
import { Plug, Sparkles } from "lucide-react";

const Header: React.ComponentType<any> =
  (HeaderMod as any).default || (HeaderMod as any).Header;
const ChatMessage: React.ComponentType<any> =
  (ChatMessageMod as any).default || (ChatMessageMod as any).ChatMessage;
const ChatComposer: React.ComponentType<any> =
  (ChatComposerMod as any).default || (ChatComposerMod as any).ChatComposer;
const SettingsModal: React.ComponentType<any> =
  (SettingsModalMod as any).default || (SettingsModalMod as any).SettingsModal;

const FONT_STACK_MAP: Record<string, string> = {
  system: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  "dm-sans": "'DM Sans', system-ui, sans-serif",
  "josefin-sans": "'Josefin Sans', system-ui, sans-serif",
  fredoka: "'Fredoka', system-ui, sans-serif",
  "open-sans": "'Open Sans', system-ui, sans-serif",
  outfit: "'Outfit', system-ui, sans-serif",
  "plus-jakarta-sans": "'Plus Jakarta Sans', system-ui, sans-serif",
};

const QUICK_PROMPTS = [
  "Summarize the key findings from my indexed PDF documents.",
  "Search my recent Gmail messages for project updates.",
  "Locate product specification files in my connected Google Drive.",
  "Research the latest industry benchmarks using live web search.",
];

export default function HomePage() {
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
  } = useProfile();

  const {
    messages,
    isLoading,
    sendMessage,
    approveToolConsent,
    denyToolConsent,
    clearMessages,
  } = useChat(assistantName);

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");

  const handleSend = (text?: string) => {
    const query = (typeof text === "string" ? text : input).trim();
    if (!query) return;
    setInput("");
    sendMessage(query);
  };

  const showOnboarding = hydrated && !isOnboarded;
  const activeFontFamily =
    FONT_STACK_MAP[profile.font] || FONT_STACK_MAP["plus-jakarta-sans"];
  const assistantLogoSrc =
    profile.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO;

  // Find index of the most recent assistant message so only new responses animate typing
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div
      style={{ fontFamily: activeFontFamily }}
      className="relative flex h-screen flex-col bg-slate-950 text-slate-100"
    >
      {/* Main Chat Workspace (Visible but blurred during onboarding) */}
      <div
        className={`flex h-full flex-col transition-all duration-300 ${
          showOnboarding
            ? "pointer-events-none select-none blur-[6px] brightness-75"
            : ""
        }`}
      >
        {Header && (
          <Header
            assistantName={assistantName}
            profile={profile}
            onOpenSettings={() => setSettingsOpen(true)}
            onSettingsClick={() => setSettingsOpen(true)}
            onClearChat={clearMessages}
            onClear={clearMessages}
          />
        )}

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-8 py-4">
                {/* Executive Hero Welcome Card */}
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl">
                  <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                      <img
                        src={assistantLogoSrc}
                        alt={`${assistantName} Emblem`}
                        className="h-16 w-16 rounded-2xl border border-indigo-400/30 object-cover shadow-lg shadow-indigo-950/50"
                      />
                      <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                          <Sparkles className="h-3 w-3" />
                          Welcome back, {profile.name || "Researcher"}
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                          {profile.headline ||
                            `Ask ${assistantName} Anything`}
                        </h1>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                          {profile.bodyText}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={reopenOnboarding}
                        className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400/40 hover:text-white"
                      >
                        Customize Identity
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-950/40 transition hover:bg-indigo-500"
                      >
                        <Plug className="h-3.5 w-3.5" />
                        Manage Connectors
                      </button>
                    </div>
                  </div>

                  {/* Starter Prompt Pills */}
                  <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {QUICK_PROMPTS.map((promptText) => (
                      <button
                        key={promptText}
                        type="button"
                        onClick={() => handleSend(promptText)}
                        className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-left text-xs text-slate-300 transition hover:border-indigo-400/40 hover:bg-slate-900 hover:text-white"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connected Ecosystem Showcase */}
                <IntegrationShowcase
                  title="Unified intelligence across your ~connected~ workspace"
                  subtitle="Query local ChromaDB vector indexes alongside Gmail, Google Drive, GitHub, Notion, Slack, and live web sources with full citation transparency."
                  illustrationSrc={assistantLogoSrc}
                  illustrationAlt={`${assistantName} Logo`}
                  integrations={DEFAULT_RAG_INTEGRATIONS}
                  onSelectIntegration={() => setSettingsOpen(true)}
                />
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

        <div className="border-t border-slate-800/80 bg-slate-950/90 px-4 py-3">
          <div className="mx-auto max-w-4xl">
            {ChatComposer && (
              <ChatComposer
                input={input}
                setInput={setInput}
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onSubmit={handleSend}
                isLoading={isLoading}
                disabled={isLoading}
              />
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Modal over Blurred Chat Workspace */}
      <OnboardingModal
        isOpen={showOnboarding}
        profile={profile}
        onUpdateProfile={updateProfile}
        onUploadUserAvatar={setAvatarFromFile}
        onUploadAssistantLogo={setAssistantLogoFromFile}
        onResetAssistantLogo={clearAssistantLogo}
        onComplete={completeOnboarding}
        onOpenConnectors={() => setSettingsOpen(true)}
      />

      {/* Settings & Connectors Modal */}
      {SettingsModal && (
        <SettingsModal
          isOpen={settingsOpen}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
