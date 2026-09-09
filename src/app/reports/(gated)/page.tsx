"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import {
  apiDeleteReport,
  apiReportDeliverableSummaries,
  apiReportHistory,
} from "@/lib/report-client";
import { ReportView } from "@/components/research/report-view";
import { ResearchLauncher } from "@/components/research/research-launcher";
import { WorkflowBrowser } from "@/components/research/workflow-browser";
import { ReportDrawer } from "@/components/research/report-drawer";
import { DeliverableBadges } from "@/components/research/deliverable-badges";
import { markSeen } from "@/components/research/report-notify";
import { iconForSlug } from "@/lib/domain-icons";
import { domainLabel, lensForSlug } from "@/lib/domains";
import { Button } from "@/components/ui/button";
import { isTerminal } from "@/lib/reports";

const STATUS_STYLES: Record<string, string> = {
  completed:
    "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
  running: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  queued: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const reportLabel = (slug: string): string => {
  if (!slug || slug === "freeform") return "Deep Research";
  return domainLabel(lensForSlug(slug) ?? "") ?? "Workflow";
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
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium ${
        STATUS_STYLES[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {isTerminal(status) ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      ) : (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      )}
      {cap(status)}
    </span>
  );
}

/** Page shell - the floating sidebar rail is fixed, so content is inset. */
function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#F5F5F5] dark:bg-gray-950">
      <Sidebar
        onSessionSelect={(id: string) => router.push(`/chat?chatId=${id}`)}
        onNewChat={() => router.push("/chat")}
        hasMessages={false}
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-8 pl-4 md:px-8 md:pl-28">
        {children}
      </div>
    </div>
  );
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const researchId = searchParams.get("research");
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [drawerReportId, setDrawerReportId] = useState<string | null>(null);

  const {
    data: reports = [],
    isLoading,
    error: reportsError,
  } = useQuery({
    queryKey: ["reports", "history"],
    queryFn: apiReportHistory,
    refetchInterval: 15000,
  });

  // Visiting the list acknowledges finished runs → clears the sidebar badge.
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

  // Deep links (and the panel's own "Open full page") render the full-page
  // view - make sure the panel isn't still stacked behind it on the way back.
  useEffect(() => {
    if (researchId) setDrawerReportId(null);
  }, [researchId]);

  const deleteMutation = useMutation({
    mutationFn: apiDeleteReport,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reports", "history"] }),
  });

  /** Reports open in the side panel; the panel links out to the full page. */
  const openReport = (id: string) => setDrawerReportId(id);

  if (researchId) {
    return (
      <Shell>
        <div className="flex items-center justify-between gap-3 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/reports")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to reports
          </Button>
        </div>
        <ReportView reportId={researchId} />
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-light text-foreground">
        Life Sciences Workflows
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Pick a lens, choose a workflow, and get a cited, source-linked report.
      </p>

      <WorkflowBrowser onLaunched={openReport} />

      {/* Freeform deep research - the workflow catalog covers the common asks,
          this covers everything else. */}
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
            <ResearchLauncher onLaunched={openReport} />
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
        ) : reportsError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {(reportsError as Error).message}
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No reports yet - run a workflow above and it&apos;ll show up here.
          </div>
        ) : (
          <div className="space-y-2.5">
            {reports.map((r) => {
              const Icon = iconForSlug(r.workflow_slug);
              return (
                <div
                  key={r.id}
                  onClick={() => openReport(r.id)}
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
                      {reportLabel(r.workflow_slug)} · {timeAgo(r.created_at)}
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
                      deleteMutation.mutate(r.id);
                    }}
                    className="flex-shrink-0 rounded-lg p-1.5 opacity-0 transition-all hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-900/20"
                    aria-label="Delete report"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReportDrawer
        reportId={drawerReportId}
        onClose={() => setDrawerReportId(null)}
      />
    </Shell>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] dark:bg-gray-950">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
