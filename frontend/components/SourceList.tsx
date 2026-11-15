import type { Source } from "@/lib/types";
import { SourceCard } from "./SourceCard";

interface SourceListProps {
  sources: Source[];
  usedWebSearch?: boolean;
}

export function SourceList({
  sources,
  usedWebSearch
}: SourceListProps): JSX.Element | null {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Sources{usedWebSearch ? " (includes web)" : ""}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {sources.map((s, i) => (
          <SourceCard key={`${s.doc_name}-${s.page_number}-${i}`} source={s} />
        ))}
      </div>
    </div>
  );
}
