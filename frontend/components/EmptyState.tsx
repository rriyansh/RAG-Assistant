"use client";

import { Bot } from "lucide-react";

interface EmptyStateProps {
  onExample: (question: string) => void;
}

const EXAMPLES: readonly string[] = [
  "What is the main topic of these documents?",
  "Summarize the key recommendations.",
  "What does the document say about data retention?",
  "List the action items mentioned."
];

export function EmptyState({ onExample }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 rounded-lg bg-accent/15 p-3 text-accent">
        <Bot size={24} />
      </div>
      <h2 className="text-base font-semibold text-gray-100">
        Ask about your documents
      </h2>
      <p className="mt-1 max-w-md text-sm text-gray-400">
        Answers are grounded in your PDFs and come with page-level citations.
      </p>

      <div className="mt-6 grid w-full max-w-md gap-2">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onExample(q)}
            className="rounded-md border border-border bg-panel/60 px-3 py-2 text-left text-sm text-gray-300 hover:bg-panel hover:text-gray-100 transition"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
