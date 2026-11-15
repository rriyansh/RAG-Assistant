"use client";

import { useState, useRef, type KeyboardEvent, type FormEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit: (question: string) => void | Promise<void>;
  disabled: boolean;
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps): JSX.Element {
  const [value, setValue] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = async (): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    await onSubmit(trimmed);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-panel/80 backdrop-blur p-3"
    >
      <div className="mx-auto max-w-3xl flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask a question about your documents..."
          disabled={disabled}
          className={cn(
            "flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60 max-h-40"
          )}
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white transition",
            "hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
          )}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-gray-500">
        Press Enter to send, Shift+Enter for a new line.
      </p>
    </form>
  );
}
