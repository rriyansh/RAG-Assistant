export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(" ");
}

export const CODES_ICON_SVG_PATH = "/icon.svg";

export const CODES_ICON_FALLBACK_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><rect x="3" y="3" width="114" height="114" rx="25" stroke="#f4f3f8" stroke-opacity="0.22" stroke-width="2"/><path d="M44 42L26 60L44 78" stroke="#f4f3f8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M76 42L94 60L76 78" stroke="#f4f3f8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M66 34L54 86" stroke="#e6e4f0" stroke-width="5.5" stroke-linecap="round"/></svg>`
  );

export const DEFAULT_RAG_ASSISTANT_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><rect x="3" y="3" width="114" height="114" rx="25" stroke="#f4f3f8" stroke-opacity="0.22" stroke-width="2"/><path d="M60 18C42 18 28 32 28 50C28 63 36 74 47 79L42 98L60 88L78 98L73 79C84 74 92 63 92 50C92 32 78 18 60 18Z" fill="#f4f3f8"/><path d="M46 48L55 54L46 60V48Z" fill="#0c0c0e"/><path d="M74 48L65 54L74 60V48Z" fill="#0c0c0e"/><path d="M52 68H68L60 75L52 68Z" fill="#0c0c0e"/></svg>`
  );

export const INBUILT_USER_PFPS: Array<{
  id: string;
  label: string;
  gender: "boy" | "girl";
  url: string;
}> = [
  {
    id: "pfp-leo",
    label: "Leo",
    gender: "boy",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#18181d"/><circle cx="60" cy="112" r="38" fill="#f4f3f8"/><path d="M44 82H76L82 120H38L44 82Z" fill="#1c1c21"/><rect x="52" y="68" width="16" height="16" rx="6" fill="#e6e4f0"/><circle cx="34" cy="54" r="7" fill="#e6e4f0"/><circle cx="86" cy="54" r="7" fill="#e6e4f0"/><circle cx="60" cy="52" r="26" fill="#f4f3f8"/><path d="M32 46C32 28 45 20 60 20C76 20 88 29 88 46C83 37 74 34 60 35C46 36 37 40 32 46Z" fill="#0c0c0e"/><path d="M38 30L46 22L54 28L64 19L74 28L82 24L86 36H34L38 30Z" fill="#0c0c0e"/><circle cx="50" cy="52" r="3.5" fill="#0c0c0e"/><circle cx="70" cy="52" r="3.5" fill="#0c0c0e"/><path d="M45 44Q50 41 55 44" stroke="#0c0c0e" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M65 44Q70 41 75 44" stroke="#0c0c0e" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M52 63Q60 69 68 63" stroke="#0c0c0e" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
      ),
  },
  {
    id: "pfp-max",
    label: "Max",
    gender: "boy",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#141417"/><circle cx="60" cy="112" r="38" fill="#e6e4f0"/><rect x="52" y="68" width="16" height="16" rx="6" fill="#e6e4f0"/><circle cx="60" cy="52" r="26" fill="#f4f3f8"/><path d="M34 45C35 26 47 21 60 21C73 21 85 26 86 45C80 38 70 36 60 36C50 36 40 38 34 45Z" fill="#0c0c0e"/><rect x="40" y="46" width="16" height="12" rx="4" stroke="#0c0c0e" stroke-width="3" fill="none"/><rect x="64" y="46" width="16" height="12" rx="4" stroke="#0c0c0e" stroke-width="3" fill="none"/><line x1="56" y1="52" x2="64" y2="52" stroke="#0c0c0e" stroke-width="3"/><circle cx="48" cy="52" r="2.8" fill="#0c0c0e"/><circle cx="72" cy="52" r="2.8" fill="#0c0c0e"/><path d="M53 65Q60 70 67 65" stroke="#0c0c0e" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>`
      ),
  },
  {
    id: "pfp-kai",
    label: "Kai",
    gender: "boy",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#18181d"/><path d="M26 52C26 31 41 18 60 18C79 18 94 31 94 52V62H86V50C86 35 75 25 60 25C45 25 34 35 34 50V62H26V52Z" fill="#e6e4f0"/><rect x="22" y="46" width="12" height="20" rx="6" fill="#f4f3f8"/><rect x="86" y="46" width="12" height="20" rx="6" fill="#f4f3f8"/><circle cx="60" cy="112" r="38" fill="#f4f3f8"/><rect x="52" y="68" width="16" height="16" rx="6" fill="#e6e4f0"/><circle cx="60" cy="53" r="25" fill="#f4f3f8"/><path d="M35 44C38 29 48 24 60 24C72 24 82 29 85 44C76 38 68 37 60 37C52 37 44 38 35 44Z" fill="#0c0c0e"/><circle cx="50" cy="53" r="3.4" fill="#0c0c0e"/><circle cx="70" cy="53" r="3.4" fill="#0c0c0e"/><path d="M54 64Q60 68 66 64" stroke="#0c0c0e" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>`
      ),
  },
  {
    id: "pfp-maya",
    label: "Maya",
    gender: "girl",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#18181d"/><path d="M30 48C30 27 43 18 60 18C77 18 90 27 90 48V86H76V56H44V86H30V48Z" fill="#0c0c0e"/><circle cx="60" cy="112" r="36" fill="#f4f3f8"/><rect x="53" y="68" width="14" height="16" rx="6" fill="#e6e4f0"/><circle cx="60" cy="52" r="24" fill="#f4f3f8"/><path d="M35 46C38 30 49 24 60 24C71 24 82 30 85 46C77 38 69 35 60 35C51 35 43 38 35 46Z" fill="#0c0c0e"/><circle cx="50" cy="52" r="3.4" fill="#0c0c0e"/><circle cx="70" cy="52" r="3.4" fill="#0c0c0e"/><path d="M46 45Q50 42 54 45" stroke="#0c0c0e" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M66 45Q70 42 74 45" stroke="#0c0c0e" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M53 63Q60 69 67 63" stroke="#0c0c0e" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>`
      ),
  },
  {
    id: "pfp-zoe",
    label: "Zoe",
    gender: "girl",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#141417"/><circle cx="60" cy="17" r="10" fill="#0c0c0e"/><path d="M32 50C32 30 44 22 60 22C76 22 88 30 88 50V74H32V50Z" fill="#0c0c0e"/><circle cx="60" cy="112" r="36" fill="#e6e4f0"/><rect x="53" y="68" width="14" height="16" rx="6" fill="#e6e4f0"/><circle cx="60" cy="53" r="24" fill="#f4f3f8"/><path d="M36 47C41 33 50 28 60 28C70 28 79 33 84 47C76 41 68 38 60 38C52 38 44 41 36 47Z" fill="#0c0c0e"/><circle cx="50" cy="53" r="3.3" fill="#0c0c0e"/><circle cx="70" cy="53" r="3.3" fill="#0c0c0e"/><path d="M53 64Q60 69 67 64" stroke="#0c0c0e" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`
      ),
  },
  {
    id: "pfp-aria",
    label: "Aria",
    gender: "girl",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#18181d"/><circle cx="32" cy="30" r="9" fill="#0c0c0e"/><circle cx="88" cy="30" r="9" fill="#0c0c0e"/><path d="M32 50C32 30 44 22 60 22C76 22 88 30 88 50V82H76V56H44V82H32V50Z" fill="#0c0c0e"/><circle cx="60" cy="112" r="36" fill="#f4f3f8"/><rect x="53" y="68" width="14" height="16" rx="6" fill="#e6e4f0"/><circle cx="60" cy="53" r="24" fill="#f4f3f8"/><path d="M36 46C42 33 51 28 60 28C69 28 78 33 84 46C76 40 68 38 60 38C52 38 44 40 36 46Z" fill="#0c0c0e"/><circle cx="50" cy="53" r="3.4" fill="#0c0c0e"/><circle cx="70" cy="53" r="3.4" fill="#0c0c0e"/><path d="M54 64Q60 70 66 64" stroke="#0c0c0e" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>`
      ),
  },
];

export const INBUILT_ASSISTANT_LOGOS: Array<{
  id: string;
  label: string;
  url: string;
}> = [
  {
    id: "reso- emblem",
    label: "Reso Core",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><rect x="4" y="4" width="112" height="112" rx="24" stroke="#f4f3f8" stroke-opacity="0.25" stroke-width="2"/><path d="M38 86V34H64C76 34 84 41 84 51C84 59 78 65 70 67L85 86H71L58 68H50V86H38ZM50 58H63C69 58 72 55 72 51C72 47 69 44 63 44H50V58Z" fill="#f4f3f8"/></svg>`
      ),
  },
  {
    id: "dragon-crest",
    label: "Dragon Emblem",
    url: DEFAULT_RAG_ASSISTANT_LOGO,
  },
  {
    id: "neural-core",
    label: "Neural Core",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><path d="M60 20L92 38V74L60 92L28 74V38L60 20Z" stroke="#f4f3f8" stroke-width="5"/><path d="M60 34L78 44V68L60 78L42 68V44L60 34Z" stroke="#e6e4f0" stroke-width="3"/><circle cx="60" cy="56" r="10" fill="#f4f3f8"/></svg>`
      ),
  },
  {
    id: "eclipse-ai",
    label: "Eclipse",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#0c0c0e"/><circle cx="60" cy="60" r="34" fill="#f4f3f8"/><circle cx="70" cy="52" r="24" fill="#0c0c0e"/></svg>`
      ),
  },
  {
    id: "spark-vertex",
    label: "Vertex",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><path d="M60 18L70 50L102 60L70 70L60 102L50 70L18 60L50 50L60 18Z" fill="#f4f3f8"/></svg>`
      ),
  },
];

export function detectProviderFromKeyString(rawKey: string): string | null {
  const key = rawKey.trim();
  if (!key) return null;
  if (key.startsWith("nvapi-")) return "nvidia";
  if (key.startsWith("xai-")) return "grok";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("sk-or-")) return "openrouter";
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("sk-ds-") || key.startsWith("ds-")) return "deepseek";
  if (key.startsWith("sk-qwen-") || key.startsWith("qwen-")) return "qwen";
  if (key.startsWith("sk-proj-") || key.startsWith("sk-svcacct-")) return "openai";
  if (key.startsWith("http://localhost:11434") || key.toLowerCase() === "ollama") return "ollama";
  return null;
}

function buildSimplePdfBytes(title: string, textContent: string): Uint8Array {
  const cleanLines = textContent
    .replace(/\r\n/g, "\n")
    .split("\n")
    .slice(0, 48)
    .map((line) =>
      line
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .slice(0, 90)
    );

  const streamRows: string[] = [
    "BT",
    "/F1 14 Tf",
    "50 770 Td",
    `(${title.replace(/[()\\]/g, "")}) Tj`,
    "/F1 10 Tf",
    "0 -22 Td",
  ];
  for (const line of cleanLines) {
    streamRows.push(`(${line}) Tj`);
    streamRows.push("0 -14 Td");
  }
  streamRows.push("ET");
  const streamData = streamRows.join("\n");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdf);
}

export function triggerFileDownload(
  filename: string,
  content: string,
  format?: "raw" | "pdf" | "doc"
): void {
  let blob: Blob;
  let finalName = filename;

  if (format === "pdf" || filename.endsWith(".pdf")) {
    const bytes = buildSimplePdfBytes(filename, content);
    blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    if (!finalName.endsWith(".pdf")) finalName += ".pdf";
  } else if (
    format === "doc" ||
    filename.endsWith(".doc") ||
    filename.endsWith(".docx")
  ) {
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
    const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title></head><body style="font-family:Open Sans,Arial,sans-serif;font-size:11pt;line-height:1.5;">${escaped}</body></html>`;
    blob = new Blob([htmlDoc], { type: "application/msword;charset=utf-8" });
    if (!finalName.endsWith(".doc"))
      finalName = finalName.replace(/\.[^.]+$/, "") + ".doc";
  } else {
    blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = finalName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
