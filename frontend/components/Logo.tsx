import * as React from "react";

export interface LogoProps {
  size?: number;
  className?: string;
  href?: string;
  external?: boolean;
}

export function Logo({
  size = 32,
  className = "",
  href,
  external = false,
}: LogoProps): JSX.Element {
  
  // CSS Trick: White background ko transparent karne ke liye aur black dino ko white karne ke liye
  const imgStyle: React.CSSProperties = {
    width: size,
    height: size,
    objectFit: "contain",
    filter: "invert(1)", // Black dino ko white karega, white bg ko black
    mixBlendMode: "screen", // Black bg ko transparent kar dega
    display: "block",
  };

  const img = (
    <img
      src="/logo.png"
      alt="RAG Assistant Logo"
      style={imgStyle}
      className={className}
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
