"use client";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application error", error.digest || error.name); }, [error]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c0c0e] px-6 text-[#f4f3f8]">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#e6e4f0]/70">Your data is safe. Retry this screen or return to the previous page.</p>
        <button onClick={reset} className="mt-5 rounded-full bg-[#f4f3f8] px-5 py-2 text-sm font-semibold text-[#0c0c0e]">Try again</button>
      </div>
    </main>
  );
}
