"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  XCircle,
} from "lucide-react";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { ActivityFeed } from "./activity-feed";
import {
  apiCancelReport,
  apiDownloadReportPdf,
  apiSyncReport,
} from "@/lib/report-client";
import type { CitationMap } from "@/lib/citation-utils";
import type { ReportDTO } from "@/lib/reports";
import { isTerminal } from "@/lib/reports";
import { ChartGallery, DeliverablesList } from "./report-artifacts";
import { ErrorNote } from "./error-note";
import { markSeen } from "./report-notify";

const stripLeadingH1 = (md: unknown): string =>
  typeof md === "string" ? md.replace(/^\s*#\s+.+\n+/, "") : "";
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const fmtElapsed = (ms: number) =>
  `${Math.floor(Math.max(0, Math.floor(ms / 1000)) / 60)}:${String(Math.max(0, Math.floor(ms / 1000)) % 60).padStart(2, "0")}`;
function useElapsed(startIso: string | null | undefined, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  return Number.isNaN(start) ? null : fmtElapsed(now - start);
}

function buildCitationMap(report: ReportDTO | undefined): CitationMap {
  const map: CitationMap = {};
  (report?.sources ?? []).forEach((source, idx) => {
    if (!source) return;
    const s = source as any;
    map[`[${idx + 1}]`] = [
      {
        number: String(idx + 1),
        title: s.title || `Source ${idx + 1}`,
        url: s.url || "",
        description: s.content ?? s.summary ?? s.description,
        toolType: "literature",
      },
    ];
  });
  return map;
}

export function ReportView({ reportId }: { reportId: string }) {
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => apiSyncReport(reportId),
    refetchInterval: (query) =>
      query.state.data?.authExpired ||
      isTerminal(query.state.data?.report?.status ?? "")
        ? false
        : 4000,
    refetchOnWindowFocus: true,
  });
  const report = data?.report;
  const elapsed = useElapsed(
    report?.created_at,
    !!report && !isTerminal(report.status),
  );
  useEffect(() => {
    if (report && isTerminal(report.status)) markSeen([report.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, report?.status]);

  /**
   * Cancelling is best-effort upstream: Valyu may take a beat to actually stop
   * the task, so the button latches into a "Cancelling…" state and the existing
   * poll carries it the rest of the way to a terminal status.
   */
  const handleCancel = async () => {
    if (!report || cancelRequested) return;
    const ok = window.confirm(
      "Cancel this research run? Work done so far will be discarded.",
    );
    if (!ok) return;
    setCancelRequested(true);
    setCancelError(null);
    try {
      await apiCancelReport(report.id);
      // Refetch through the sync route rather than trusting the cancel
      // response: it rebuilds the DTO from a minimal base and would drop the
      // workflow slug and params this view renders from.
      await queryClient.invalidateQueries({ queryKey: ["report", report.id] });
      queryClient.invalidateQueries({ queryKey: ["reports", "history"] });
    } catch (e) {
      setCancelError((e as Error).message);
      setCancelRequested(false);
    }
  };
  const citationMap = useMemo(() => buildCitationMap(report), [report]);
  const bodyText = useMemo(
    () => stripLeadingH1(report?.output ?? ""),
    [report?.output],
  );
  if (isLoading)
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading report…
      </div>
    );
  if (error)
    return (
      <div className="flex items-center gap-2 py-12 text-destructive">
        <AlertCircle className="h-4 w-4" />
        {(error as Error).message}
      </div>
    );
  if (!report) return null;
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            {report.workflow_slug === "freeform"
              ? "Deep Research"
              : report.workflow_slug}{" "}
            · {cap(report.mode)}
          </div>
          <h1 className="text-2xl font-light leading-tight tracking-tight text-foreground">
            {report.title}
          </h1>
        </div>
        {report.status === "completed" && report.pdf_url ? (
          <a
            href={report.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-foreground hover:border-foreground/20"
          >
            <ExternalLink className="h-4 w-4" />
            Open PDF
          </a>
        ) : report.status === "completed" && report.output ? (
          <button
            onClick={async () => {
              setDownloading(true);
              setPdfError(null);
              try {
                await apiDownloadReportPdf(report.id, report.title || "report");
              } catch (e) {
                setPdfError((e as Error).message);
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-foreground hover:border-foreground/20 disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            PDF
          </button>
        ) : null}
      </div>
      {pdfError && <ErrorNote message={pdfError} className="mb-4" />}
      {!isTerminal(report.status) && (
        <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">
                  {cancelRequested ? "Stopping research" : "Research running"}
                </div>
                <p className="text-xs text-muted-foreground">
                  <Clock className="inline h-3 w-3" /> {elapsed ?? "0:00"}{" "}
                  elapsed
                </p>
                {data?.syncError && !data.authExpired && (
                  <ErrorNote message={data.syncError} className="mt-0.5" />
                )}
                {cancelError && (
                  <ErrorNote message={cancelError} className="mt-0.5" />
                )}
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelRequested}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted-foreground"
            >
              {cancelRequested ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {cancelRequested ? "Cancelling…" : "Cancel"}
            </button>
          </div>
        </div>
      )}{" "}
      {!isTerminal(report.status) && (
        <ActivityFeed activity={report.activity} running />
      )}
      {report.status === "completed" && report.activity?.length ? (
        <details className="group mb-4 overflow-hidden rounded-2xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Research activity
            </span>
            <span className="text-xs text-muted-foreground group-open:hidden">
              Show
            </span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">
              Hide
            </span>
          </summary>
          <div className="border-t border-border px-5 pb-5 pt-4">
            <ActivityFeed activity={report.activity} />
          </div>
        </details>
      ) : null}
      {/* Deliverables sit above the report body — they are what most readers
          came for. */}
      {report.status === "completed" && report.deliverables?.length ? (
        <DeliverablesList deliverables={report.deliverables} />
      ) : null}
      {report.status === "completed" && report.output ? (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <CitationTextRenderer
            text={bodyText}
            citations={citationMap}
            className="prose prose-sm dark:prose-invert max-w-none"
          />
          {report.sources?.length ? (
            <div className="mt-6 pt-4 text-xs text-muted-foreground">
              {report.sources.length} sources
            </div>
          ) : null}
        </div>
      ) : null}
      {report.status === "completed" && report.images?.length ? (
        <ChartGallery images={report.images} />
      ) : null}
      {(report.status === "failed" || report.status === "cancelled") && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
          <div className="text-sm font-medium text-destructive capitalize">
            {report.status}
          </div>
          <div className="mt-1 text-xs text-destructive">
            {report.error_message || "The research task did not complete."}
          </div>
        </div>
      )}
    </>
  );
}
