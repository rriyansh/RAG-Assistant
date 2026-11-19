"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type StreamingMode = "character" | "word";

export interface AiStreamingTextProps {
  text: string;
  speed?: number;
  mode?: StreamingMode;
  showCursor?: boolean;
  animate?: boolean;
  onComplete?: () => void;
  className?: string;
}

export function AiStreamingText({
  text,
  speed = 16,
  mode = "character",
  showCursor = true,
  animate = true,
  onComplete,
  className,
}: AiStreamingTextProps) {
  const [displayedText, setDisplayedText] = React.useState(animate ? "" : text);
  const [isComplete, setIsComplete] = React.useState(!animate);

  React.useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);

    if (!text) {
      setIsComplete(true);
      return;
    }

    const tokens = mode === "word" ? text.split(/(\s+)/) : text.split("");
    let currentIndex = 0;
    let isCancelled = false;
    let lastTime = 0;

    const animateFrame = (time: number) => {
      if (isCancelled) return;

      if (time - lastTime >= speed) {
        lastTime = time;
        const stepCount = mode === "character" && tokens.length > 320 ? 4 : 1;
        let chunk = "";

        for (let i = 0; i < stepCount; i++) {
          const token = tokens[currentIndex];
          if (currentIndex < tokens.length && token !== undefined) {
            chunk += token;
            currentIndex++;
          }
        }

        if (chunk) {
          setDisplayedText((prev) => prev + chunk);
        }

        if (currentIndex >= tokens.length) {
          if (!isCancelled) {
            setIsComplete(true);
            onComplete?.();
          }
          return;
        }
      }

      requestAnimationFrame(animateFrame);
    };

    const frameId = requestAnimationFrame(animateFrame);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [text, speed, mode, animate, onComplete]);

  return (
    <div
      data-slot="ai-streaming-text"
      role="status"
      aria-live="polite"
      aria-label="AI response"
      className={cn("relative", className)}
    >
      <span className="whitespace-pre-wrap">{displayedText}</span>
      {showCursor && !isComplete && (
        <span className="ml-0.5 inline-block h-[1.15em] w-[2px] animate-pulse bg-[#f4f3f8] align-middle will-change-[opacity]" />
      )}
    </div>
  );
}

export default AiStreamingText;
