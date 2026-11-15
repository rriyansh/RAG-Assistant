"use client";

export function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h2 className="font-display text-base font-medium tracking-tight text-gray-100 sm:text-[17px]">
        Ask about your documents
      </h2>
      <p className="font-display mt-1.5 max-w-md text-xs text-gray-400 sm:text-[13px]">
        Answers are grounded in your PDFs and come with page-level citations.
      </p>
    </div>
  );
}
