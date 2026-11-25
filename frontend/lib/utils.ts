export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(" ");
}

export const CODES_ICON_SVG_PATH = "/dino.svg";

export const CODES_ICON_FALLBACK_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><rect x="3" y="3" width="114" height="114" rx="25" stroke="#f4f3f8" stroke-opacity="0.22" stroke-width="2"/><path d="M44 42L26 60L44 78" stroke="#f4f3f8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M76 42L94 60L76 78" stroke="#f4f3f8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M66 34L54 86" stroke="#e6e4f0" stroke-width="5.5" stroke-linecap="round"/></svg>`
  );

export const DEFAULT_RAG_ASSISTANT_LOGO = CODES_ICON_SVG_PATH;
export const LEGACY_ASSISTANT_LOGO =
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
    url: "/portraits/pfp-leo.webp",
  },
  {
    id: "pfp-max",
    label: "Max",
    gender: "boy",
    url: "/portraits/pfp-max.webp",
  },
  {
    id: "pfp-kai",
    label: "Kai",
    gender: "boy",
    url: "/portraits/pfp-kai.webp",
  },
  {
    id: "pfp-maya",
    label: "Maya",
    gender: "girl",
    url: "/portraits/pfp-maya.webp",
  },
  {
    id: "pfp-zoe",
    label: "Zoe",
    gender: "girl",
    url: "/portraits/pfp-zoe.webp",
  },
  {
    id: "pfp-aria",
    label: "Aria",
    gender: "girl",
    url: "/portraits/pfp-aria.webp",
  },
];

export const INBUILT_ASSISTANT_LOGOS: Array<{
  id: string;
  label: string;
  url: string;
}> = [
  {
    id: "dino",
    label: "Dino",
    url: CODES_ICON_SVG_PATH,
  },
  {
    id: "reso- emblem",
    label: "Reso Core",
    url: CODES_ICON_SVG_PATH,
  },
  {
    id: "dragon-crest",
    label: "Dragon Emblem",
    url: "/portraits/dragon-crest.webp",
  },
  {
    id: "neural-core",
    label: "Neural Core",
    url: "/portraits/neural-core.webp",
  },
  {
    id: "eclipse-ai",
    label: "Eclipse",
    url: "/portraits/eclipse-ai.webp",
  },
  {
    id: "spark-vertex",
    label: "Vertex",
    url: "/portraits/spark-vertex.webp",
  },
  { id: "pip", label: "Pip", url: "/portraits/pip.webp" },
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
