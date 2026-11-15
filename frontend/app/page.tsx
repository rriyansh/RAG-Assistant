"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { Header } from "@/components/Header";
import { ChatMessage } from "@/components/ChatMessage";
import ChatComposer from "@/components/ChatComposer";
import { EmptyState } from "@/components/EmptyState";

export default function HomePage(): JSX.Element {
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    async (question: string): Promise<void> => {
      await sendMessage(question);
    },
    [sendMessage]
  );

  return (
    <div className="flex h-screen flex-col bg-[#0b0f14]">
      <Header onClear={clearChat} canClear={messages.length > 0} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 pb-5 pt-2">
        <ChatComposer onSubmit={handleSubmit} disabled={isLoading} />
      </div>
    </div>
  );
}
