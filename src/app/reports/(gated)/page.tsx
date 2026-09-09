"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { WorkflowBrowser } from "@/components/research/workflow-browser";
import { ReportDrawer } from "@/components/research/report-drawer";
import { ResearchLauncher } from "@/components/research/research-launcher";
import { DeliverableBadges } from "@/components/research/deliverable-badges";
import {
  apiDeleteReport,
  apiReportDeliverableSummaries,
  apiReportHistory,
} from "@/lib/report-client";
import { isTerminal } from "@/lib/reports";
import { markSeen } from "@/components/research/report-notify";
import { iconForSlug } from "@/lib/domain-icons";
import { domainLabel, lensForSlug } from "@/lib/domains";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-positive/10 text-positive",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  queued: "bg-muted text-muted-foreground",
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const reportLabel = (slug: string): string | null => {
  if (!slug || slug === "freeform") return "Deep Research";
  return domainLabel(lensForSlug(slug) ?? "") ?? null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const running = !isTerminal(status);
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium ${
        STATUS_STYLES[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {running ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {cap(status)}
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const {
    data: reports = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["reports", "history"],
    queryFn: apiReportHistory,
    refetchInterval: 8000,
    retry: 1,
  });

  // Visiting the reports list acknowledges all finished runs → clears the badge.
  useEffect(() => {
    const done = reports.filter((r) => isTerminal(r.status)).map((r) => r.id);
    if (done.length) markSeen(done);
  }, [reports]);

  // Only completed runs can have deliverables, and the history payload doesn't
  // carry them - fetch the types separately so rows can flag them up front.
  const completedIds = useMemo(
    () =>
      reports
        .filter((r) => r.status === "completed")
        .map((r) => r.id)
        .sort(),
    [reports],
  );
  const { data: deliverableTypes = {} } = useQuery({
    queryKey: ["reports", "deliverables", completedIds],
    queryFn: () => apiReportDeliverableSummaries(completedIds),
    enabled: completedIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const handleDelete = async (id: string) => {
    await apiDeleteReport(id);
    queryClient.invalidateQueries({ queryKey: ["reports", "history"] });
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      <Sidebar
        currentSessionId={undefined}
        onSessionSelect={(id: string) => router.push(`/?research=${id}`)}
        onNewChat={() => router.push("/")}
        hasMessages={false}
      />

      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
          <h1 className="mb-1 text-2xl font-light text-foreground">
            Life Sciences Workflows
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Pick a lens, choose a workflow, and get a cited, source-linked
            report.
          </p>

          <Suspense
            fallback={
              <div className="py-10 text-sm text-muted-foreground">
                Loading…
              </div>
            }
          >
            <WorkflowBrowser onOpenReport={setOpenReportId} />
          </Suspense>

          {/* Freeform deep research - the workflow catalog covers the common
              asks, this covers everything else. */}
          <div className="mt-6">
            <button
              onClick={() => setFreeformOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-left transition-colors hover:border-foreground/20"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                <Sparkles
                  className="h-5 w-5 text-muted-foreground"
                  strokeWidth={1.75}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">
                  Freeform deep research
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Ask anything - no template, same cited output.
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
                  freeformOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {freeformOpen && (
              <div className="mt-3">
                <ResearchLauncher onLaunched={setOpenReportId} />
              </div>
            )}
          </div>

          {/* Reports list */}
          <div className="mt-12">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your reports
              </span>
              {reports.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-px text-[11px] text-muted-foreground">
                  {reports.length}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : error && reports.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-8 text-center text-sm">
                <span className="text-muted-foreground">
                  {(error as Error).message}
                </span>
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground/20 disabled:opacity-50"
                >
                  {isFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Try again
                </button>
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No reports yet - run a workflow above and it&apos;ll show up
                here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {reports.map((r) => {
                  const Icon = iconForSlug(r.workflow_slug);
                  const label = reportLabel(r.workflow_slug);
                  return (
                    <div
                      key={r.id}
                      onClick={() => setOpenReportId(r.id)}
                      className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 transition-all hover:border-foreground/20 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                        <Icon
                          className="h-5 w-5 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {r.title}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {label ? `${label} · ` : ""}
                          {timeAgo(r.created_at)}
                        </div>
                      </div>
                      <DeliverableBadges types={deliverableTypes[r.id] ?? []} />
                      <StatusBadge status={r.status} />
                      {r.status === "completed" && r.pdf_url && (
                        <a
                          href={r.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          aria-label="Open PDF"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.id);
                        }}
                        className="flex-shrink-0 rounded-lg p-1.5 opacity-0 transition-all hover:bg-destructive/10 group-hover:opacity-100"
                        aria-label="Delete report"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportDrawer
        reportId={openReportId}
        onClose={() => setOpenReportId(null)}
      />
    </div>
  );
}
