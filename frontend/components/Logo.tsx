import * as React from "react";
import Image from "next/image";

export interface LogoProps {
  /** Size in pixels. Defaults to 32. */
  size?: number;
  className?: string;
  /** Optional link target. */
  href?: string;
  /** Opens in new tab if true. */
  external?: boolean;
}

export function Logo({
  size = 32,
  className = "",
  href,
  external = false,
}: LogoProps): JSX.Element {
  
  const img = (
    <Image
      src="/logo.png"
      alt="RAG Assistant Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  );

  if (!href) return img;

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label="RAG Assistant"
      className="inline-flex items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#5FB2F2]"
    >
      {img}
    </a>
  );
}
