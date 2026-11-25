"use client";

import React, { useState } from "react";
import { localeDirection, ui } from "../lib/locales";
import { Header } from "../components/Header";
import { ChatMessage } from "../components/ChatMessage";
import ChatComposer from "../components/ChatComposer";
import { SettingsModal } from "../components/SettingsModal";
import { OnboardingModal } from "../components/OnboardingModal";
import { useChat } from "../hooks/useChat";
import { DEFAULT_RAG_ASSISTANT_LOGO } from "../lib/utils";
import { FONT_OPTIONS } from "../lib/fonts";
import { useProfile } from "../hooks/useProfile";

export default function ChatWorkspace({initialSettings = false}: {initialSettings?: boolean}) {
  const [mode, setMode] = useState<"chat" | "agent">("chat");
  const [startInConnectors, openConnectors] = useState(false);
  const [attachment, attach] = useState<{id:string; name:string}>();
  const [connectorDraft, setConnectorDraft] = useState<{text: string}>();
  const profileState = useProfile();
  const {
    profile,
    assistantName,
    isOnboarded,
    hydrated,
    update: updateProfile,
    completeOnboarding,
    reopenOnboarding,
  } = profileState;

  const labels = ui(profile.locale);
  React.useEffect(() => {
    const viewport = window.visualViewport;
    const syncViewport = () => {
      document.documentElement.style.setProperty("--app-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      document.documentElement.style.setProperty("--app-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      document.documentElement.style.removeProperty("--app-viewport-height");
      document.documentElement.style.removeProperty("--app-viewport-top");
    };
  }, []);
  React.useEffect(() => { if (hydrated) setMode(profile.defaultMode ?? "chat"); }, [hydrated, profile.defaultMode]);
  React.useEffect(() => {
    document.documentElement.lang = profile.locale ?? "en";
    document.documentElement.dir = localeDirection(profile.locale ?? "en");
  }, [profile.locale]);
  const chat = useChat(assistantName, "chat", profile, hydrated);
  const agent = useChat(assistantName, "agent", profile, hydrated);
  const {
    messages, activity,
    isLoading,
    sendMessage,
    approveToolConsent,
    denyToolConsent,
    clearMessages, regenerate,
  } = mode === "chat" ? chat : agent;

  const [settingsOpen, setSettingsOpen] = useState(initialSettings);
  React.useEffect(() => {
    const restorePage = () => setSettingsOpen(/^\/settings(?:\/|$)/.test(location.pathname));
    window.addEventListener("popstate", restorePage);
    return () => window.removeEventListener("popstate", restorePage);
  }, []);
  const [connectorNotice, setConnectorNotice] = useState("");
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (/^\/settings(?:\/|$)/.test(url.pathname)) setSettingsOpen(true);
    const result = url.searchParams.get("connector");
    if (!result?.startsWith("github-")) return;
    setConnectorNotice(result === "github-connected" ? "GitHub connected." :
      result === "github-unavailable" ? "GitHub sign-in is not configured for this deployment. You can still connect using a token." :
      "GitHub authorization could not finish. Try connecting again.");
    openConnectors(true);
    setSettingsOpen(true);
    url.searchParams.delete("connector");
    window.history.replaceState(window.history.state, "", url);
  }, []);


  React.useEffect(() => {
    if (!hydrated) return;
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = !profile.theme || profile.theme === "system"
        ? (scheme.matches ? "dark" : "light") : profile.theme;
    };
    apply();
    scheme.addEventListener("change", apply);
    return () => scheme.removeEventListener("change", apply);
  }, [hydrated, profile.theme]);

  const handleSend = (text: string) => {
    const query = text.trim();
    if (!query) return;
    if (profile.haptics) navigator.vibrate?.(20);
    sendMessage(query, [], undefined, mode === "agent" ? attachment?.id : undefined, true);
  };

  const showOnboarding = hydrated && !isOnboarded;
  const activeFontFamily =
    FONT_OPTIONS.find(option => option.id === profile.font)?.family ?? "'DM Sans', sans-serif";
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
      style={{ fontFamily: activeFontFamily, fontSize: 18, fontWeight: 400, fontOpticalSizing: "auto" }}
      className="reso-workspace relative flex min-h-0 flex-col bg-[#0c0c0e] text-[#f4f3f8] antialiased"
    >
      <div
        className={`flex min-h-0 flex-1 flex-col transition-all duration-300 ${
          showOnboarding
            ? "pointer-events-none select-none blur-[6px] brightness-75"
            : ""
        }`}
      >
        <Header
            canClear={messages.length > 0}
            onOpenSettings={() => { openConnectors(profile.actionButton === "connectors"); setSettingsOpen(true); }}
            onClear={clearMessages}
          />

        <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          <div className={`mx-auto w-full max-w-3xl ${messages.length ? "space-y-2" : "grid min-h-full place-items-center"}`}>
            {messages[0]?.timestamp && <p className="text-center text-xs text-[#c6c4cf]">{messages[0].timestamp}</p>}
            {messages.length === 0 ? (
              <section className="chat-welcome">
                {(profile.assistantLogo ?? DEFAULT_RAG_ASSISTANT_LOGO) && <img className="mx-auto mb-4 h-16 w-16 object-contain" src={profile.assistantLogo ?? DEFAULT_RAG_ASSISTANT_LOGO} width={64} height={64} alt={assistantName} />}
                <h1>{labels.welcome}</h1>
                <p>{labels.help}</p>
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
                  onRegenerate={regenerate}
                  onApproveConsent={approveToolConsent}
                  onDenyConsent={denyToolConsent}
                />
              ))
            )}
          </div>
        </main>

        <div className="reso-composer-bar border-t border-[#e6e4f0]/10 bg-[#0c0c0e] px-3 py-2 sm:px-4">
          <div className="mx-auto w-full max-w-3xl">
            {isLoading && <div role="status" className="mb-2 max-h-24 overflow-auto text-xs leading-5 text-[#e6e4f0]/80">
              <p className="font-semibold motion-safe:animate-pulse">Thinking…</p>
              {activity.slice(-2).map((line, index) => <p key={index}>{line}</p>)}
            </div>}
            <div className="mb-1 flex items-center gap-3 text-xs">
              {mode === "agent" && <button aria-label="Add connector" title="Add connector" disabled={isLoading} onClick={() => { openConnectors(true); setSettingsOpen(true); }} className="px-3 py-2 text-xl">+</button>}
              {mode === "agent" && attachment && <button disabled={isLoading} onClick={() => attach(undefined)} aria-label={`Remove ${attachment.name}`}>{attachment.name} ×</button>}
            </div>
            {profile.workspaceShortcut && <button type="button" className="mb-2 rounded-full border border-white/20 px-3 py-2 text-xs" onClick={() => { openConnectors(profile.actionButton === "connectors"); setSettingsOpen(true); }}>Workspace shortcut</button>}
            <ChatComposer modePicker={<details className="relative"><summary aria-label="Choose workspace" title="Choose workspace" className="cursor-pointer list-none px-3 py-2">⌃</summary><div className="absolute bottom-full end-0 z-20 grid w-48 rounded-xl bg-[#242328] p-2 text-sm text-white shadow-lg">{(["chat","agent"] as const).map(item => <button type="button" key={item} disabled={isLoading} aria-pressed={mode === item} className="p-2 text-start" onClick={e => {e.currentTarget.closest("details")?.removeAttribute("open");setMode(item)}}>{item === "chat" ? labels.chat : labels.agent}</button>)}<a className="p-2" href="/studio">Build Your Own RAG-AI</a></div></details>} key={mode} draft={mode === "agent" ? connectorDraft : undefined} models={[]} mode={mode} onSubmit={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingModal
        isOpen={showOnboarding}
        profile={profile}
        onUpdateProfile={updateProfile}
        onComplete={completeOnboarding}
      />}

      <SettingsModal
          conversationMode={mode}
          startInConnectors={startInConnectors}
          connectorNotice={connectorNotice}
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
