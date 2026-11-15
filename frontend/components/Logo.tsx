import * as React from "react";

export interface LogoProps {
  size?: number | string;
  className?: string;
  accent?: string;
  /** Optional link target. When set, the whole mark becomes clickable. */
  href?: string;
  /** When true, opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
}

export function Logo({
  size = 32,
  className,
  accent,
  href,
  external = false,
}: LogoProps): JSX.Element {
  const style = accent
    ? ({ "--logo-accent": accent } as React.CSSProperties)
    : undefined;

  const svg = (
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
        x="12" y="16" width="34" height="38" rx="6"
        fill="none" stroke="currentColor" strokeWidth="4.5"
      />
      <line
        x1="22" y1="28" x2="38" y2="28"
        stroke="currentColor" strokeWidth="4" strokeLinecap="round"
      />
      <line
        x1="22" y1="36" x2="34" y2="36"
        stroke="currentColor" strokeWidth="4" strokeLinecap="round"
      />
      <circle cx="49" cy="13" r="5.5" fill="var(--logo-accent, #5FB2F2)" />
    </svg>
  );

  if (!href) return svg;

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label="Open shared conversation"
      className="inline-flex items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#5FB2F2]"
    >
      {svg}
    </a>
  );
}
<Logo
  size={32}
  href="https://chatgpt.com/s/t_6af9d892f9b48191a7f8f71054589998"
  external
  className="text-[#a9dcff]"
/>
