"use client";

import {
  FileText,
  FileSpreadsheet,
  FileBarChart,
  Presentation,
  type LucideIcon,
} from "lucide-react";

/** Same glyph + wording the drawer's Deliverables section uses. */
const TYPE_ICON: Record<string, LucideIcon> = {
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  pptx: Presentation,
  docx: FileText,
  pdf: FileBarChart,
};
const TYPE_LABEL: Record<string, string> = {
  xlsx: "Excel",
  csv: "CSV",
  pptx: "PowerPoint",
  docx: "Word",
  pdf: "PDF",
};

const SHORT_LABEL: Record<string, string> = {
  xlsx: "XLS",
  csv: "CSV",
  pptx: "PPT",
  docx: "DOC",
  pdf: "PDF",
};

const MAX_SHOWN = 3;

/**
 * Compact file-type chips flagging that a report produced deliverables, so the
 * list conveys it before the report is opened.
 */
export function DeliverableBadges({
  types,
  className = "",
}: {
  types: string[];
  className?: string;
}) {
  if (!types.length) return null;
  const shown = types.slice(0, MAX_SHOWN);
  const extra = types.length - shown.length;
  const title = `Includes ${types
    .map((t) => TYPE_LABEL[t] ?? t.toUpperCase())
    .join(", ")}`;

  return (
    <div
      className={`flex flex-shrink-0 items-center gap-1 ${className}`}
      title={title}
      aria-label={title}
    >
      {shown.map((type) => {
        const Icon = TYPE_ICON[type] ?? FileText;
        return (
          <span
            key={type}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-1 text-[10px] font-semibold leading-none tracking-tight text-muted-foreground"
          >
            <Icon className="h-3 w-3" strokeWidth={1.75} />
            {SHORT_LABEL[type] ?? type.toUpperCase().slice(0, 3)}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="text-[10px] font-medium text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}
