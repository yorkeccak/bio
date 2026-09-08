"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertCircle,
  Search,
  Zap,
  FileText,
  Plus,
  ExternalLink,
  Microscope,
} from "lucide-react";
import { DOMAINS, MODES, LIFE_SCIENCES_VERTICAL } from "@/lib/domains";
import { iconForDomain } from "@/lib/domain-icons";
import type { WorkflowDTO, WorkflowVariable } from "@/lib/workflow-types";
import { apiListWorkflows } from "@/lib/workflow-client";
import { apiCreateReport } from "@/lib/report-client";
import { ErrorNote } from "./error-note";
import { requestNotifyPermission } from "./report-notify";

const LS_KEY = "reports.lastDomain";

// Deliverable file types → compact badge labels.
const DELIVERABLE_LABEL: Record<string, string> = {
  xlsx: "XLS",
  docx: "DOC",
  pdf: "PDF",
  csv: "CSV",
  pptx: "PPT",
};

const deliverableLabels = (w: WorkflowDTO): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of w.deliverables ?? []) {
    const label = DELIVERABLE_LABEL[d.type] ?? d.type?.toUpperCase().slice(0, 3);
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out.slice(0, 3);
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function ModeChip({ mode }: { mode: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-foreground">
      <Zap className="h-3 w-3 fill-current" strokeWidth={0} />
      {cap(mode)}
    </span>
  );
}

function DeliverableBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-9 w-8 flex-col items-center justify-center rounded-md border border-border text-muted-foreground">
      <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
      <span className="mt-0.5 text-[7px] font-bold leading-none tracking-tight">
        {label}
      </span>
    </span>
  );
}

function ValyuBadge() {
  return (
    <span className="flex-shrink-0 rounded-full border border-border px-1.5 py-px text-[10px] font-semibold leading-tight tracking-wider text-muted-foreground">
      VALYU
    </span>
  );
}

/**
 * Catalog of Valyu's prebuilt life sciences workflows, grouped into lenses.
 * Selecting one swaps the grid for a generated parameter form.
 */
export function WorkflowBrowser({
  onLaunched,
}: {
  onLaunched: (reportId: string) => void;
}) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [domain, setDomain] = useState<string>("all");
  const [selected, setSelected] = useState<WorkflowDTO | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Deep link: /reports?workflow=<slug> opens that run panel once the catalog
  // loads; /reports?domain=<id> picks a lens. Otherwise restore the last lens.
  useEffect(() => {
    const wf = searchParams.get("workflow");
    if (wf) {
      setPendingSlug(wf);
      return;
    }
    const deepLinkDomain = searchParams.get("domain");
    if (deepLinkDomain && DOMAINS.some((d) => d.id === deepLinkDomain)) {
      setDomain(deepLinkDomain);
      return;
    }
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (saved && DOMAINS.some((d) => d.id === saved)) setDomain(saved);
  }, [searchParams]);

  const selectDomain = (id: string) => {
    setDomain(id);
    setSelected(null);
    try {
      localStorage.setItem(LS_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const {
    data: workflows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workflows", LIFE_SCIENCES_VERTICAL],
    queryFn: () => apiListWorkflows(LIFE_SCIENCES_VERTICAL),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const lens = DOMAINS.find((d) => d.id === domain);
    // "All" keeps the popular workflows up top; a lens shows its own slugs, and
    // any slug we haven't grouped yet falls back into "All" only.
    const base =
      !lens || lens.id === "all"
        ? [...workflows].sort(
            (a, b) => Number(b.popular) - Number(a.popular),
          )
        : workflows.filter((w) => lens.slugs.includes(w.slug));
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((w) =>
      `${w.title} ${w.subtitle} ${w.description}`.toLowerCase().includes(q),
    );
  }, [workflows, domain, query]);

  // Resolve a deep-linked workflow once its catalog has loaded.
  useEffect(() => {
    if (!pendingSlug) return;
    const found = workflows.find((w) => w.slug === pendingSlug);
    if (found) {
      setSelected(found);
      setPendingSlug(null);
    }
  }, [pendingSlug, workflows]);

  return (
    <div>
      {/* Lens filter - segmented control */}
      <div className="mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-muted p-1">
          {DOMAINS.map((d) => {
            const Icon = iconForDomain(d.id);
            const active = domain === d.id;
            return (
              <button
                key={d.id}
                onClick={() => selectDomain(d.id)}
                title={d.blurb}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${active ? "text-foreground" : "text-muted-foreground"}`}
                  strokeWidth={2}
                />
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <RunPanel
          workflow={selected}
          onBack={() => setSelected(null)}
          onLaunched={(id) => {
            queryClient.invalidateQueries({ queryKey: ["reports", "history"] });
            setSelected(null);
            onLaunched(id);
          }}
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows…"
              className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading workflows…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-10 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" /> {(error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted">
                <Microscope className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">
                {query
                  ? `No workflow for “${query}” yet`
                  : "No workflows in this lens yet"}
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Workflows are Valyu&apos;s prebuilt research templates. Don&apos;t see the
                one you need? Build your own on the Valyu platform and run it right here.
              </p>
              <a
                href="https://platform.valyu.ai/user/workflows"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Create your own workflow
                <ExternalLink className="h-3.5 w-3.5 opacity-70 transition-opacity group-hover:opacity-100" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filtered.map((w) => {
                const Icon = iconForDomain(
                  DOMAINS.find((d) => d.slugs.includes(w.slug))?.id,
                );
                const deliverables = deliverableLabels(w);
                return (
                  <button
                    key={w.slug}
                    onClick={() => setSelected(w)}
                    className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-foreground/20 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-[15px] font-semibold text-foreground">
                          {w.title}
                        </h3>
                        <ValyuBadge />
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-1 text-[13px] text-muted-foreground">
                      {w.subtitle || w.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ModeChip mode={w.recommended_mode} />
                        {w.estimated_time && (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> {w.estimated_time}
                          </span>
                        )}
                      </div>
                      {deliverables.length > 0 && (
                        <div className="flex flex-shrink-0 items-center gap-1">
                          {deliverables.map((d) => (
                            <DeliverableBadge key={d} label={d} />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RunPanel({
  workflow,
  onBack,
  onLaunched,
}: {
  workflow: WorkflowDTO;
  onBack: () => void;
  onLaunched: (reportId: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState(workflow.recommended_mode || "standard");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredMet = workflow.variables
    .filter((v) => v.required)
    .every((v) => (values[v.key] ?? "").trim().length > 0);

  const set = (k: string, val: string) =>
    setValues((p) => ({ ...p, [k]: val }));

  const buildParams = () => {
    const params: Record<string, unknown> = {};
    for (const v of workflow.variables) {
      const raw = values[v.key];
      if (raw == null || raw === "") continue;
      params[v.key] = v.type === "number" ? Number(raw) : raw;
    }
    return params;
  };

  const deriveTitle = () => {
    const first = workflow.variables.find((v) => v.required && values[v.key]);
    const suffix = first ? ` - ${values[first.key]}` : "";
    return `${workflow.title}${suffix}`;
  };

  const handleRun = async () => {
    if (!requiredMet || launching) return;
    setLaunching(true);
    setError(null);
    void requestNotifyPermission();
    try {
      const report = await apiCreateReport({
        workflow_slug: workflow.slug,
        workflow_params: buildParams(),
        mode,
        title: deriveTitle(),
        estimated_time: workflow.estimated_time ?? undefined,
      });
      onLaunched(report.id);
    } catch (e) {
      setError((e as Error).message);
      setLaunching(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to workflows
      </button>

      <div className="mb-1 text-base font-medium text-foreground">
        {workflow.title}
      </div>
      <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
        {workflow.subtitle}
        {workflow.estimated_time && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {workflow.estimated_time}
          </span>
        )}
      </div>

      {/* Form generated from the workflow's declared variables */}
      <div className="space-y-4">
        {workflow.variables.map((v) => (
          <Field
            key={v.key}
            variable={v}
            value={values[v.key] ?? ""}
            onChange={(val) => set(v.key, val)}
          />
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-medium text-foreground">Depth</div>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                mode === m.id
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/20"
              }`}
              title={m.note}
            >
              <span className="font-medium text-foreground">{m.label}</span>
              {workflow.recommended_mode === m.id && (
                <span className="ml-1.5 text-[10px] text-emerald-600">rec</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote message={error} className="mt-4" />}

      <div className="mt-5">
        <button
          onClick={handleRun}
          disabled={!requiredMet || launching}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40"
        >
          {launching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Run report
        </button>
      </div>
    </div>
  );
}

function Field({
  variable,
  value,
  onChange,
}: {
  variable: WorkflowVariable;
  value: string;
  onChange: (val: string) => void;
}) {
  const base =
    "w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-foreground/40";
  const hint = variable.examples?.length
    ? `e.g. ${variable.examples.slice(0, 2).join(" · ")}`
    : variable.help;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-foreground">
        {variable.label}
        {variable.required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {variable.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={variable.placeholder}
          rows={3}
          className={base}
        />
      ) : variable.type === "enum" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">Select…</option>
          {variable.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={
            variable.type === "number"
              ? "number"
              : variable.type === "date"
                ? "date"
                : "text"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={variable.placeholder}
          className={base}
        />
      )}
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
