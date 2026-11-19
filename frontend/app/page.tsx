// app/page.tsx
"use client";

import React, { useState } from "react";
import Header from "../components/Header";
import ChatMessage from "../components/ChatMessage";
import ChatComposer from "../components/ChatComposer";
import SettingsModal from "../components/SettingsModal";
import { useChat } from "../hooks/useChat";
import { useProfile } from "../hooks/useProfile";

export default function HomePage() {
  const { assistantName } = useProfile();
  const {
    messages,
    isLoading,
    sendMessage,
    approveToolConsent,
    denyToolConsent,
    clearMessages,
  } = useChat(assistantName);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <Header
        assistantName={assistantName}
        onOpenSettings={() => setSettingsOpen(true)}
        onClearChat={clearMessages}
      />

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
          <ChatComposer
            onSend={(text) => sendMessage(text)}
            isLoading={isLoading}
          />
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
