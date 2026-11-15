import * as React from "react";

export interface LogoProps {
  /**
   * Any valid CSS size: a number (px), or a CSS unit string
   * like "2rem", "1.5em", "100%", "40px". Defaults to 32.
   */
  size?: number | string;
  className?: string;
  /** Overrides the citation dot color. Defaults to ice blue #5FB2F2. */
  accent?: string;
}

export function Logo({
  size = 32,
  className,
  accent,
}: LogoProps): JSX.Element {
  const style = accent
    ? ({ "--logo-accent": accent } as React.CSSProperties)
    : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="RAG Assistant"
      className={className}
      style={style}
    >
      <rect
        x="12"
        y="16"
        width="34"
        height="38"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
      />
      <line
        x1="22"
        y1="28"
        x2="38"
        y2="28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="22"
        y1="36"
        x2="34"
        y2="36"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle
        cx="49"
        cy="13"
        r="5.5"
        fill="var(--logo-accent, #5FB2F2)"
      />
    </svg>
  );
}
