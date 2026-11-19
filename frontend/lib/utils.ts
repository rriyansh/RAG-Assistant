export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(" ");
}

export const DEFAULT_RAG_ASSISTANT_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><rect x="3" y="3" width="114" height="114" rx="25" stroke="#f4f3f8" stroke-opacity="0.2" stroke-width="2"/><path d="M60 18C42 18 28 32 28 50C28 63 36 74 47 79L42 98L60 88L78 98L73 79C84 74 92 63 92 50C92 32 78 18 60 18Z" fill="#f4f3f8"/><path d="M46 48L55 54L46 60V48Z" fill="#0c0c0e"/><path d="M74 48L65 54L74 60V48Z" fill="#0c0c0e"/><path d="M52 68H68L60 75L52 68Z" fill="#0c0c0e"/></svg>`
  );

export const INBUILT_USER_PFPS: Array<{ id: string; label: string; url: string }> = [
  {
    id: "pfp-minimal",
    label: "Minimal",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#1c1c21"/><circle cx="50" cy="36" r="16" fill="#f4f3f8"/><path d="M22 84C22 68 34 58 50 58C66 58 78 68 78 84" fill="#f4f3f8"/></svg>`
      ),
  },
  {
    id: "pfp-cyber",
    label: "Visor",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#141417"/><circle cx="50" cy="50" r="30" fill="#f4f3f8"/><rect x="28" y="42" width="44" height="12" rx="6" fill="#0c0c0e"/></svg>`
      ),
  },
  {
    id: "pfp-orbit",
    label: "Orbit",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#18181d"/><circle cx="50" cy="50" r="18" fill="#f4f3f8"/><circle cx="50" cy="50" r="32" stroke="#e6e4f0" stroke-width="4" stroke-dasharray="12 8" fill="none"/></svg>`
      ),
  },
  {
    id: "pfp-monolith",
    label: "Prism",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#141417"/><polygon points="50,18 82,76 18,76" fill="#f4f3f8"/><polygon points="50,34 68,68 32,68" fill="#141417"/></svg>`
      ),
  },
  {
    id: "pfp-grid",
    label: "Matrix",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#141417"/><rect x="24" y="24" width="22" height="22" rx="5" fill="#f4f3f8"/><rect x="54" y="24" width="22" height="22" rx="5" fill="#e6e4f0" fill-opacity="0.5"/><rect x="24" y="54" width="22" height="22" rx="5" fill="#e6e4f0" fill-opacity="0.5"/><rect x="54" y="54" width="22" height="22" rx="5" fill="#f4f3f8"/></svg>`
      ),
  },
  {
    id: "pfp-shield",
    label: "Crest",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#141417"/><path d="M50 18L78 30V52C78 70 66 82 50 88C34 82 22 70 22 52V30L50 18Z" fill="#f4f3f8"/><circle cx="50" cy="52" r="10" fill="#0c0c0e"/></svg>`
      ),
  },
];

export const INBUILT_ASSISTANT_LOGOS: Array<{ id: string; label: string; url: string }> = [
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
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="28" fill="#141417"/><path d="M60 22L90 39V73L60 90L30 73V39L60 22Z" stroke="#f4f3f8" stroke-width="5"/><circle cx="60" cy="56" r="14" fill="#f4f3f8"/></svg>`
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
    blob = new Blob([bytes], { type: "application/pdf" });
    if (!finalName.endsWith(".pdf")) finalName += ".pdf";
  } else if (format === "doc" || filename.endsWith(".doc") || filename.endsWith(".docx")) {
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
    const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title></head><body style="font-family:Open Sans,Arial,sans-serif;font-size:11pt;line-height:1.5;">${escaped}</body></html>`;
    blob = new Blob([htmlDoc], { type: "application/msword;charset=utf-8" });
    if (!finalName.endsWith(".doc")) finalName = finalName.replace(/\.[^.]+$/, "") + ".doc";
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
