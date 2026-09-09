"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
} from "lucide-react";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { ActivityFeed } from "./activity-feed";
import { ErrorNote } from "./error-note";
import { AuthModal } from "@/components/auth/auth-modal";
import { apiSyncReport, apiDownloadReportPdf } from "@/lib/report-client";
import { isTerminal } from "@/lib/reports";
import {
  buildCitationMapFromSources,
  extractMarkdownLinkCitations,
} from "@/lib/citation-utils";
import { ChartGallery, DeliverablesList } from "./report-artifacts";
import { markSeen } from "./report-notify";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Reports lead with their title as an H1, which the view already renders in
 *  the header - strip that leading H1 from the body to avoid a duplicate title. */
const stripLeadingH1 = (md: string) => md.replace(/^\s*#\s+.+\n+/, "");

const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Live mm:ss elapsed since `startIso`, ticking while `active`. */
function useElapsed(
  startIso: string | null | undefined,
  active: boolean,
): string | null {
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

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Renders a single report's content (header, live status, body). Layout-
 * agnostic - used by both the full-page route and the slide-in drawer. Owns
 * the resumable poll (sync on mount, refetch while running, stop on terminal).
 */
export function ReportView({ reportId }: { reportId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => apiSyncReport(reportId),
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling once we need re-auth - the token is dead, retrying is
      // pointless until the user signs in again.
      if (data?.authExpired) return false;
      const status = data?.report?.status;
      return status && isTerminal(status) ? false : 4000;
    },
    refetchOnWindowFocus: true,
  });

  const report = data?.report;
  const progress = data?.progress;
  // Hook must run unconditionally (before the early returns below).
  const elapsed = useElapsed(
    report?.created_at,
    !!report && !isTerminal(report.status),
  );

  // Viewing a finished run acknowledges it (clears the sidebar badge).
  useEffect(() => {
    if (report && isTerminal(report.status)) markSeen([report.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, report?.status]);

  // Resolve `[n]` markers to favicon citation cards. Two formats are supported:
  // bare markers backed by the report's `sources[]`, and inline `[[n]](url)`
  // markdown-link citations embedded in the body. Both feed one citation map,
  // and the body is rewritten to bare markers. Runs before the early returns.
  const { citationMap, bodyText } = useMemo(() => {
    const stripped = stripLeadingH1(report?.output ?? "");
    const { citations: linkCites, text } =
      extractMarkdownLinkCitations(stripped);
    const citationMap = {
      ...buildCitationMapFromSources(report?.sources),
      ...linkCites,
    };
    return { citationMap, bodyText: text };
  }, [report?.output, report?.sources]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 py-12 text-destructive">
        <AlertCircle className="h-4 w-4" /> {(error as Error).message}
      </div>
    );
  }
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
          <h1 className="text-2xl font-light leading-tight tracking-tight text-foreground sm:text-[27px]">
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
              try {
                await apiDownloadReportPdf(report.id, report.title || "report");
              } catch (e) {
                alert((e as Error).message);
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

      {/* Re-auth needed - the session lapsed while the run continues server-side.
          Offer sign-in; the run itself is unaffected. */}
      {!isTerminal(report.status) && data?.authExpired && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground">
              Sign in to keep tracking progress
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your session expired. The report keeps running; sign back in to
              see live updates.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-2 inline-flex items-center rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              Sign in with Valyu to continue
            </button>
          </div>
        </div>
      )}

      {/* Running / queued */}
      {!isTerminal(report.status) && (
        <>
          {/* A non-transient status-poll error (e.g. credits) - the run may
              still be alive. Surface it as a non-fatal notice instead of
              leaving the card spinning silently or rendering terminal failure. */}
          {data?.syncError && !data?.authExpired && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">
                  Couldn&apos;t refresh status
                </div>
                <ErrorNote message={data.syncError} className="mt-0.5" />
              </div>
            </div>
          )}

          <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/15" />
                <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  {progress?.total_steps
                    ? `Researching · step ${progress.current_step ?? 0} of ${progress.total_steps}`
                    : "Researching your query…"}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {elapsed ?? "0:00"} elapsed
                  </span>
                  {report.estimated_time && (
                    <span>· est. {report.estimated_time}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {progress?.total_steps ? (
                <ProgressBar
                  value={progress.current_step ?? 0}
                  max={progress.total_steps}
                />
              ) : (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/40" />
                </div>
              )}
            </div>

            <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
              Runs in the background - safe to close this and come back.
              It&apos;s saved in
              <span className="text-foreground"> Reports</span> and keeps
              generating until it&apos;s done.
            </p>
          </div>

          {/* Live activity feed */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Activity feed
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <ActivityFeed activity={report.activity} running />
        </>
      )}

      {/* Failed / cancelled */}
      {(report.status === "failed" || report.status === "cancelled") && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
          <div>
            <div className="text-sm font-medium capitalize text-destructive">
              {report.status}
            </div>
            <div className="mt-1 text-xs text-destructive">
              {report.error_message || "The research task did not complete."}
            </div>
          </div>
        </div>
      )}

      {/* Completed - the files first. They are the thing a finished report is
          often opened for, and buried under the body they were easy to miss. */}
      {report.status === "completed" &&
        report.deliverables &&
        report.deliverables.length > 0 && (
          <DeliverablesList deliverables={report.deliverables} />
        )}

      {/* Research activity (collapsed) then the report */}
      {report.status === "completed" &&
        report.activity &&
        report.activity.length > 0 && (
          <details className="group mb-4 overflow-hidden rounded-2xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/30">
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
            <div className="border-t border-border px-5 pb-5 pt-1">
              <ActivityFeed activity={report.activity} />
            </div>
          </details>
        )}

      {report.status === "completed" && report.output && (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <CitationTextRenderer
            text={bodyText}
            citations={citationMap}
            className="prose prose-sm dark:prose-invert max-w-none [--tw-prose-headings:var(--foreground)] [--tw-prose-bold:var(--foreground)]"
          />
          {report.sources && report.sources.length > 0 && (
            <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
              {report.sources.length} sources
            </div>
          )}
        </div>
      )}

      {report.status === "completed" &&
        report.images &&
        report.images.length > 0 && <ChartGallery images={report.images} />}

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
