import type { FontId } from "./types";

export const FONT_OPTIONS: Array<{ id: FontId; label: string; family: string }> = [
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans (Default)", family: "'Plus Jakarta Sans', sans-serif" },
  { id: "open-sans", label: "Open Sans", family: "'Open Sans', sans-serif" },
  { id: "dm-sans", label: "DM Sans", family: "'DM Sans', sans-serif" },
  { id: "outfit", label: "Outfit", family: "'Outfit', sans-serif" },
  { id: "josefin-sans", label: "Josefin Sans", family: "'Josefin Sans', sans-serif" },
  { id: "fredoka", label: "Fredoka", family: "'Fredoka', sans-serif" },
  { id: "google-sans", label: "Google Sans Flex", family: "'Google Sans Flex', sans-serif" },
  { id: "manrope", label: "Manrope", family: "Manrope, sans-serif" },
  { id: "source-sans-3", label: "Source Sans 3", family: "'Source Sans 3', sans-serif" },
  { id: "system", label: "System Default", family: "system-ui, sans-serif" },
];
