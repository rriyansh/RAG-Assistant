// lib/utils.ts

export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Official Default RAG Assistant Emblem (Data URI SVG)
 * Used as the default Assistant Logo in Onboarding, Header, Integration Showcase, and Chat Messages.
 */
export const DEFAULT_RAG_ASSISTANT_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="ragGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="50%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#0EA5E9"/>
    </linearGradient>
    <linearGradient id="coreGlow" x1="25" y1="20" x2="95" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E0E7FF"/>
      <stop offset="100%" stop-color="#BAE6FD"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="28" fill="url(#ragGrad)"/>
  <circle cx="60" cy="60" r="42" stroke="white" stroke-opacity="0.16" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M60 22L88 38V70L60 86L32 70V38L60 22Z" stroke="url(#coreGlow)" stroke-width="4.5" stroke-linejoin="round" fill="#0F172A" fill-opacity="0.35"/>
  <path d="M60 36L76 45.5V64.5L60 74L44 64.5V45.5L60 36Z" fill="url(#coreGlow)"/>
  <circle cx="60" cy="22" r="4.5" fill="#FFFFFF"/>
  <circle cx="88" cy="38" r="4.5" fill="#FFFFFF"/>
  <circle cx="88" cy="70" r="4.5" fill="#FFFFFF"/>
  <circle cx="60" cy="86" r="4.5" fill="#FFFFFF"/>
  <circle cx="32" cy="70" r="4.5" fill="#FFFFFF"/>
  <circle cx="32" cy="38" r="4.5" fill="#FFFFFF"/>
  <path d="M46 98H74" stroke="white" stroke-opacity="0.85" stroke-width="4" stroke-linecap="round"/>
</svg>`);
