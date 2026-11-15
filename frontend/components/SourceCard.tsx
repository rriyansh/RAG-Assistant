import { FileText } from "lucide-react";
import type { Source } from "@/lib/types";

interface SourceCardProps {
  source: Source;
}

export function SourceCard({ source }: SourceCardProps): JSX.Element {
  const scorePct = Math.round(source.score * 100);

  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-panel/60 px-2.5 py-2 text-xs">
      <FileText size={14} className="mt-0.5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-gray-200" title={source.doc_name}>
          {source.doc_name}
        </p>
        <p className="text-gray-500">
          Page {source.page_number} · Score {scorePct}%
        </p>
      </div>
    </div>
  );
}
