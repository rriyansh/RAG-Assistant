"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatComposer from "@/components/ChatComposer";
import { ChatMessage } from "@/components/ChatMessage";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { SettingsModal } from "@/components/SettingsModal";
import { useProfile } from "@/hooks/useProfile";
import { useChat } from "@/hooks/useChat";

export default function HomePage(): JSX.Element {
  const { profile } = useProfile();
  const {
    messages,
    isLoading,
    sendMessage,
    approveToolConsent,
    denyToolConsent,
    clearMessages,
  } = useChat(profile.assistantName);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    async (question: string): Promise<void> => {
      await sendMessage(question);
    },
    [sendMessage]
  );

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <Header
        onClear={clearMessages}
        onOpenSettings={() => setSettingsOpen(true)}
        canClear={messages.length > 0}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  assistantName={profile.assistantName}
                  profile={profile}
                  isLoading={isLoading}
                  onApproveConsent={approveToolConsent}
                  onDenyConsent={denyToolConsent}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <div className="w-full border-t border-slate-800/80 bg-slate-950/90 px-4 pb-5 pt-3">
        <div className="mx-auto max-w-3xl">
          <ChatComposer onSubmit={handleSubmit} disabled={isLoading} />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
