"use client";

import React, { useState } from "react";
import { Header } from "../components/Header";
import { ChatMessage } from "../components/ChatMessage";
import ChatComposer from "../components/ChatComposer";
import { SettingsModal } from "../components/SettingsModal";
import { OnboardingModal } from "../components/OnboardingModal";
import { useChat } from "../hooks/useChat";
import { DEFAULT_RAG_ASSISTANT_LOGO } from "../lib/utils";
import { FONT_OPTIONS } from "../lib/fonts";
import { useProfile } from "../hooks/useProfile";

export default function HomePage() {
  const [mode, setMode] = useState<"chat" | "agent">("chat");
  const [startInConnectors, openConnectors] = useState(false);
  const [attachment, attach] = useState<{id:string; name:string}>();
  const [search, setSearch] = useState({chat:false, agent:false});
  const [connectorDraft, setConnectorDraft] = useState<{text: string}>();
  const profileState = useProfile();
  const {
    profile,
    assistantName,
    isOnboarded,
    hydrated,
    update: updateProfile,
    setAvatarFromFile,
    completeOnboarding,
    reopenOnboarding,
  } = profileState;

  const chat = useChat(assistantName, "chat");
  const agent = useChat(assistantName, "agent");
  const {
    messages, activity,
    isLoading,
    sendMessage,
    approveToolConsent,
    denyToolConsent,
    clearMessages,
  } = mode === "chat" ? chat : agent;

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);


  const handleSend = (text: string) => {
    const query = text.trim();
    if (!query) return;
    sendMessage(query, [], undefined, mode === "agent" ? attachment?.id : undefined, search[mode]);
  };

  const showOnboarding = hydrated && !isOnboarded;
  const activeFontFamily =
    FONT_OPTIONS.find(option => option.id === profile.font)?.family ?? "'Plus Jakarta Sans', sans-serif";
  React.useEffect(() => {
    if (hydrated) document.documentElement.dataset.font = profile.font;
  }, [hydrated, profile.font]);
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
            canClear={messages.length > 0}
            onOpenSettings={() => { openConnectors(false); setSettingsOpen(true); }}
            onClear={clearMessages}
          />

        <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          <div className={`mx-auto w-full max-w-3xl ${messages.length ? "space-y-2" : "grid min-h-full place-items-center"}`}>
            {messages[0]?.timestamp && <p className="text-center text-xs text-[#c6c4cf]">{messages[0].timestamp}</p>}
            {messages.length === 0 ? (
              <section className="chat-welcome">
                {(profile.assistantLogo ?? DEFAULT_RAG_ASSISTANT_LOGO) && <img className="mx-auto mb-4 h-16 w-16 object-contain" src={profile.assistantLogo ?? DEFAULT_RAG_ASSISTANT_LOGO} width={64} height={64} alt={assistantName} />}
                <h1>Welcome to RESO AGENT</h1>
                <p>How can I help you?</p>
              </section>
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

        <div className="border-t border-[#e6e4f0]/10 bg-[#0c0c0e] px-3 py-2 sm:px-4">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-1" aria-label="Conversation mode">
              {(["chat", "agent"] as const).map(item => <button key={item} type="button"
                aria-pressed={mode === item} disabled={isLoading} onClick={() => { setMode(item); if (item === "agent" && mode !== item) { openConnectors(true); setSettingsOpen(true); } }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mode === item ? "bg-[#f4f3f8] text-[#141417]" : "text-[#e6e4f0]/70"}`}>
                {item === "agent" ? "Agent" : "Chat"}
              </button>)}
            </div>
            {isLoading && <div role="status" className="mb-2 max-h-24 overflow-auto text-xs leading-5 text-[#e6e4f0]/80">
              {activity.slice(-3).map((line, index) => <p key={index}>{line}</p>)}
            </div>}
            <div className="mb-1 flex items-center gap-3 text-xs">
              {mode === "agent" && <button aria-label="Add connector" title="Add connector" disabled={isLoading} onClick={() => { openConnectors(true); setSettingsOpen(true); }} className="px-3 py-2 text-xl">+</button>}
              {mode === "agent" && attachment && <button disabled={isLoading} onClick={() => attach(undefined)} aria-label={`Remove ${attachment.name}`}>{attachment.name} ×</button>}
              <button disabled={isLoading} aria-pressed={search[mode]} onClick={() => setSearch({...search,[mode]:!search[mode]})} className="rounded-full px-3 py-2 aria-pressed:bg-white aria-pressed:text-black">Web search</button>
            </div>
            <ChatComposer key={mode} draft={mode === "agent" ? connectorDraft : undefined} models={[]} mode={mode} onSubmit={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingModal
        isOpen={showOnboarding}
        profile={profile}
        onUpdateProfile={updateProfile}
        onUploadUserAvatar={setAvatarFromFile}
        onComplete={completeOnboarding}
      />}

      <SettingsModal
          conversationMode={mode}
          startInConnectors={startInConnectors}
          onUseConnector={(text, conn) => { attach(conn); setMode("agent"); setConnectorDraft({text}); setSettingsOpen(false); }}
          onOpenOnboarding={() => { setSettingsOpen(false); reopenOnboarding(); }}
          profileState={profileState}
          isOpen={settingsOpen}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
    </div>
  );
}
