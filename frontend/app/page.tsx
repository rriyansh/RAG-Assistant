// app/page.tsx
"use client";

import React, { useState } from "react";
import * as HeaderMod from "../components/Header";
import * as ChatMessageMod from "../components/ChatMessage";
import * as ChatComposerMod from "../components/ChatComposer";
import * as SettingsModalMod from "../components/SettingsModal";
import { useChat } from "../hooks/useChat";
import * as ProfileMod from "../hooks/useProfile";

const Header: React.ComponentType<any> =
  (HeaderMod as any).default || (HeaderMod as any).Header;
const ChatMessage: React.ComponentType<any> =
  (ChatMessageMod as any).default || (ChatMessageMod as any).ChatMessage;
const ChatComposer: React.ComponentType<any> =
  (ChatComposerMod as any).default || (ChatComposerMod as any).ChatComposer;
const SettingsModal: React.ComponentType<any> =
  (SettingsModalMod as any).default || (SettingsModalMod as any).SettingsModal;
const useProfileHook =
  (ProfileMod as any).useProfile || (ProfileMod as any).default;

export default function HomePage() {
  const profile = typeof useProfileHook === "function" ? useProfileHook() : {};
  const assistantName: string =
    profile?.assistantName || profile?.profile?.assistantName || "Assistant";

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

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {Header && (
        <Header
          assistantName={assistantName}
          profile={profile?.profile}
          onOpenSettings={() => setSettingsOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          onClearChat={clearMessages}
          onClear={clearMessages}
        />
      )}

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-2">
          {messages.length === 0 ? (
            <div className="mt-20 text-center space-y-2">
              <h1 className="text-2xl font-semibold text-slate-100">
                Ask {assistantName} Anything
              </h1>
              <p className="text-sm text-slate-400">
                Powered by hybrid PDF vector retrieval, live web search, and MCP tool calling.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                assistantName={assistantName}
                isLoading={isLoading}
                onApproveConsent={approveToolConsent}
                onDenyConsent={denyToolConsent}
              />
            ))
          )}
        </div>
      </main>

      <div className="border-t border-slate-800/80 bg-slate-950/90 px-4 py-3">
        <div className="mx-auto max-w-3xl">
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
