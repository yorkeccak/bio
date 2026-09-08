"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileBarChart,
  Presentation,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResearchImage, ResearchDeliverable } from "@/lib/valyu-workflows";

const typeIcon: Record<string, typeof FileText> = {
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  pptx: Presentation,
  docx: FileText,
  pdf: FileBarChart,
};
const typeLabel: Record<string, string> = {
  xlsx: "Excel",
  csv: "CSV",
  pptx: "PowerPoint",
  docx: "Word",
  pdf: "PDF",
};

export function ChartGallery({ images }: { images: ResearchImage[] }) {
  if (!images.length) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Charts
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {images.map((img, i) => (
          <figure
            key={img.imageId ?? `${img.imageUrl}-${i}`}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <img
              src={img.imageUrl}
              alt={img.title || `Chart ${i + 1}`}
              loading="lazy"
              className="h-auto w-full bg-white"
            />
            {img.title && (
              <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                {img.title}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

export function DeliverablesList({
  deliverables,
}: {
  deliverables: ResearchDeliverable[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const usable = deliverables.filter((d) => d.url);
  if (!usable.length) return null;
  return (
    <section className="mb-4">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Deliverables
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {usable.map((d, i) => {
          const Icon = typeIcon[d.type] ?? FileText;
          const failed = d.status === "failed";
          return (
            <button
              key={d.id ?? `${d.url}-${i}`}
              onClick={() => !failed && setOpenIndex(i)}
              disabled={failed}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon className="h-7 w-7 flex-shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {d.title ||
                    d.description ||
                    `${typeLabel[d.type] ?? d.type} file`}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {failed
                    ? "Generation failed"
                    : (typeLabel[d.type] ?? d.type.toUpperCase())}
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
      {openIndex != null && usable[openIndex] && (
        <DeliverableViewer
          deliverable={usable[openIndex]}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}

function DeliverableViewer({
  deliverable,
  onClose,
}: {
  deliverable: ResearchDeliverable;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex max-h-[88vh] flex-col overflow-hidden p-0 gap-0"
        style={{ width: "95vw", maxWidth: "1200px", height: "88vh" }}
      >
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium truncate">
            <FileText className="h-[18px] w-[18px]" />
            {deliverable.title ||
              `${typeLabel[deliverable.type] ?? deliverable.type} file`}
          </DialogTitle>
          <a
            href={deliverable.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-muted/20">
          <DeliverableContent deliverable={deliverable} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeliverableContent({
  deliverable,
}: {
  deliverable: ResearchDeliverable;
}) {
  if (deliverable.type === "csv") return <CsvTable url={deliverable.url} />;
  if (
    deliverable.type === "docx" ||
    deliverable.type === "pptx" ||
    deliverable.type === "xlsx" ||
    deliverable.type === "pdf"
  )
    return (
      <iframe
        src={deliverable.url}
        className="h-full w-full border-0"
        title={`${deliverable.type} preview`}
      />
    );
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Preview not available.
    </div>
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function CsvTable({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) =>
        r.ok
          ? r.text()
          : Promise.reject(new Error(`Failed to load (${r.status})`)),
      )
      .then((t) => alive && setText(t))
      .catch(() => alive && setText(""));
    return () => {
      alive = false;
    };
  }, [url]);
  const rows = useMemo(() => (text ? parseCsv(text) : []), [text]);
  if (text === null)
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  if (!rows.length)
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Empty file
      </div>
    );
  const [header, ...body] = rows;
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-border px-4 py-2 text-left font-semibold"
              >
                {h || `Column ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.slice(0, 200).map((r, ri) => (
            <tr key={ri} className="border-b border-border hover:bg-muted/50">
              {header.map((_, ci) => (
                <td key={ci} className="whitespace-nowrap px-4 py-2">
                  {r[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
