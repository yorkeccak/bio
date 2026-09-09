"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  Plus,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { MODES } from "@/lib/domains";
import { apiCreateResearch, apiSuggestDeliverables } from "@/lib/report-client";
import type { DeliverableItem, DeliverableType } from "@/lib/report-client";
import { requestNotifyPermission } from "./report-notify";
import { ErrorNote } from "./error-note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ToolKey = "charts" | "codeExecution" | "deliverables";

const RESEARCH_TOOLS: {
  key: ToolKey;
  label: string;
  icon: typeof BarChart3;
  title: string;
}[] = [
  {
    key: "charts",
    label: "Chart Generation",
    icon: BarChart3,
    title: "Generate charts in the report",
  },
  {
    key: "codeExecution",
    label: "Code Execution",
    icon: Terminal,
    title: "Run Python for calculations and analysis",
  },
  {
    key: "deliverables",
    label: "Deliverables",
    icon: FileSpreadsheet,
    title: "Export Excel/PowerPoint/Word files",
  },
];

// Deliverable formats offered in the picker, with a sample description to
// guide the user on what to ask for. Office formats (xlsx/pptx/docx) are
// produced via code execution, so requesting any of them forces it on.
const DELIVERABLE_FORMATS: {
  type: DeliverableType;
  label: string;
  icon: string;
  sample: string;
}[] = [
  {
    type: "xlsx",
    label: "Excel (.xlsx)",
    icon: "/assets/filetypes/excel.svg",
    sample:
      "e.g. Trial tracker with phase, enrolment, primary endpoint and readout date",
  },
  {
    type: "pptx",
    label: "PowerPoint (.pptx)",
    icon: "/assets/filetypes/powerpoint.svg",
    sample: "e.g. 10-slide deck: mechanism, pipeline, competitors, risks",
  },
  {
    type: "docx",
    label: "Word (.docx)",
    icon: "/assets/filetypes/word.svg",
    sample: "e.g. Full memo with exec summary, evidence and appendix",
  },
  {
    type: "csv",
    label: "CSV (.csv)",
    icon: "/assets/filetypes/csv.svg",
    sample: "e.g. Asset table: sponsor, target, modality, phase, indication",
  },
  {
    type: "pdf",
    label: "PDF (.pdf)",
    icon: "/assets/filetypes/pdf.svg",
    sample: "e.g. One-page summary of key findings and the verdict",
  },
];

const SAMPLE_DESC: Record<DeliverableType, string> = Object.fromEntries(
  DELIVERABLE_FORMATS.map((f) => [f.type, f.sample]),
) as Record<DeliverableType, string>;

const OFFICE_FORMATS: DeliverableType[] = ["xlsx", "pptx", "docx"];
const isOfficeFormat = (type: DeliverableType) => OFFICE_FORMATS.includes(type);

/** Shortest query worth reasoning about; mirrors the server-side gate. */
const MIN_SUGGEST_LENGTH = 20;
/** Let typing settle before spending a model call on it. */
const SUGGEST_DEBOUNCE_MS = 800;
const MAX_DELIVERABLES = 5;

/**
 * Freeform DeepResearch launcher. Same input surface as the home research box:
 * one query, a depth knob, research tool pills, and a deliverables builder that
 * pre-fills itself from the query.
 */
export function ResearchLauncher({
  onLaunched,
}: {
  onLaunched: (reportId: string) => void;
}) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("standard");
  const [tools, setTools] = useState<{
    charts: boolean;
    codeExecution: boolean;
    deliverables: DeliverableItem[];
  }>({ charts: true, codeExecution: false, deliverables: [] });
  const [deliverablesOpen, setDeliverablesOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Office deliverables (xlsx/pptx/docx) are produced via code execution, so
  // requesting any of them implies it (reflected in the Code Execution pill).
  const hasOfficeDeliverable = tools.deliverables.some((d) =>
    isOfficeFormat(d.type),
  );
  const hasSuggestion = tools.deliverables.some((d) => d.suggested);

  const toggleTool = (key: "charts" | "codeExecution") =>
    setTools((prev) => ({ ...prev, [key]: !prev[key] }));

  const addDeliverable = () =>
    setTools((prev) =>
      prev.deliverables.length >= MAX_DELIVERABLES
        ? prev
        : {
            ...prev,
            deliverables: [
              ...prev.deliverables,
              { type: "xlsx", description: "" },
            ],
          },
    );

  // Editing a row makes it the user's, not the extractor's: drop the suggested
  // flag so it loses the badge and stops being eligible for replacement.
  const updateDeliverable = (i: number, patch: Partial<DeliverableItem>) =>
    setTools((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d, idx) =>
        idx === i ? { ...d, ...patch, suggested: false } : d,
      ),
    }));

  const removeDeliverable = (i: number) =>
    setTools((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, idx) => idx !== i),
    }));

  // Opening the panel with nothing configured seeds one row so it's not empty.
  // Keep the seed outside the state updater: updaters must be pure (React runs
  // them twice in dev), so seeding inside would add two rows.
  const toggleDeliverablesPanel = () => {
    const willOpen = !deliverablesOpen;
    setDeliverablesOpen(willOpen);
    if (willOpen && tools.deliverables.length === 0) addDeliverable();
  };

  // Lets the async callback read the live list without making the effect depend
  // on `tools` - which would re-fire it on every edit the user makes.
  const deliverablesRef = useRef(tools.deliverables);
  deliverablesRef.current = tools.deliverables;
  // Last query suggested for. Stops a re-fire, and stops us re-opening a panel
  // the user just closed, while the query itself is unchanged.
  const suggestedForRef = useRef<string | null>(null);

  // A suggestion belongs to the query it came from. Left attached when the
  // query moves on, it would produce a file about the wrong subject and bill
  // for it - so drop ours whenever they stop matching. Rows the user wrote are
  // theirs and always stay.
  const dropStaleSuggestions = () => {
    const kept = deliverablesRef.current.filter((d) => !d.suggested);
    if (kept.length === deliverablesRef.current.length) return;
    setTools((prev) => ({ ...prev, deliverables: kept }));
    if (kept.length === 0) setDeliverablesOpen(false);
  };

  useEffect(() => {
    if (launching) return;
    const q = input.trim();
    if (q.length < MIN_SUGGEST_LENGTH) {
      dropStaleSuggestions();
      suggestedForRef.current = null;
      return;
    }
    if (suggestedForRef.current === q) return;
    // No AbortController here - see research-console.tsx: an aborted fetch
    // surfaces as a runtime error overlay in dev even when handled.
    let cancelled = false;
    const timer = setTimeout(async () => {
      const suggestions = await apiSuggestDeliverables(q).catch(() => []);
      if (cancelled) return;
      suggestedForRef.current = q;
      if (!suggestions.length) {
        dropStaleSuggestions();
        return;
      }
      // Only fill space the user hasn't claimed. A row they typed a description
      // into is theirs and blocks the fill.
      const canFill = deliverablesRef.current.every(
        (d) => d.suggested || !d.description.trim(),
      );
      if (!canFill) return;
      setTools((prev) => ({
        ...prev,
        deliverables: suggestions.slice(0, MAX_DELIVERABLES),
      }));
      setDeliverablesOpen(true);
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, launching]);

  // Synchronous re-entrancy guard. The `launching` state can't block a second
  // submit() fired in the same tick (rapid double-click / double-Enter) because
  // React hasn't re-rendered yet - without this, one fumble = two runs.
  const submittingRef = useRef(false);

  const submit = async () => {
    const q = input.trim();
    if (!q || submittingRef.current) return;
    submittingRef.current = true;
    setLaunching(true);
    setError(null);
    // Ask for OS notification permission so we can ping when this finishes
    // (it's a long async run - the user will likely switch away).
    void requestNotifyPermission();
    try {
      const report = await apiCreateResearch(q, mode, {
        charts: tools.charts,
        codeExecution:
          tools.codeExecution ||
          tools.deliverables.some((d) => isOfficeFormat(d.type)),
        deliverables: tools.deliverables,
      });
      onLaunched(report.id);
    } catch (e) {
      setError((e as Error).message);
      setLaunching(false);
      submittingRef.current = false; // allow retry after a failure
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative flex items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything - I'll run deep research and cite my sources…"
          disabled={launching}
          rows={1}
          className="max-h-40 min-h-[52px] w-full resize-none overflow-y-auto rounded-2xl border border-border bg-card px-4 py-3 pr-14 text-sm shadow-sm outline-none focus:border-muted-foreground/40 sm:text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          onClick={submit}
          disabled={launching || !input.trim()}
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary p-0 text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-40"
          aria-label="Start research"
        >
          {launching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Depth + Tools - two labeled sub-groups on a single wrapping row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[11px] font-medium text-muted-foreground">
            Depth
          </span>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.note}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                mode === m.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
              }`}
            >
              {m.id === "fast" && (
                <Zap className="h-3 w-3 fill-current" strokeWidth={0} />
              )}
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[11px] font-medium text-muted-foreground">
            Tools
          </span>
          {RESEARCH_TOOLS.map((t) => {
            const Icon = t.icon;
            if (t.key === "deliverables") {
              const count = tools.deliverables.length;
              const active = count > 0;
              return (
                <button
                  key={t.key}
                  onClick={toggleDeliverablesPanel}
                  aria-pressed={active}
                  aria-expanded={deliverablesOpen}
                  title={t.title}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                  {count > 0 && <span className="opacity-70">({count})</span>}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      deliverablesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              );
            }
            const active =
              t.key === "codeExecution"
                ? tools.codeExecution || hasOfficeDeliverable
                : tools[t.key];
            return (
              <button
                key={t.key}
                onClick={() => toggleTool(t.key as "charts" | "codeExecution")}
                aria-pressed={active}
                title={t.title}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deliverables builder - pick a format and describe what it should contain */}
      {deliverablesOpen && (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground">
              Deliverables
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {hasSuggestion
                ? "Suggested from your query - edit or remove before running"
                : "Pick a format and describe what it should contain"}
            </span>
          </div>

          <div className="space-y-2">
            {tools.deliverables.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={d.type}
                  onValueChange={(v) =>
                    updateDeliverable(i, { type: v as DeliverableType })
                  }
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="Deliverable format"
                    className="w-[170px] shrink-0 bg-background text-[11px] font-medium"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_FORMATS.map((f) => (
                      <SelectItem
                        key={f.type}
                        value={f.type}
                        className="text-[11px]"
                      >
                        <Image
                          src={f.icon}
                          alt=""
                          width={16}
                          height={16}
                          unoptimized
                          className="h-4 w-4 object-contain"
                        />
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-0 flex-1">
                  <input
                    value={d.description}
                    onChange={(e) =>
                      updateDeliverable(i, { description: e.target.value })
                    }
                    placeholder={SAMPLE_DESC[d.type]}
                    maxLength={500}
                    className={`w-full rounded-lg border border-border bg-background py-1.5 pl-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-muted-foreground/40 ${
                      d.suggested ? "pr-[76px]" : "pr-2.5"
                    }`}
                  />
                  {d.suggested && (
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/80">
                      Suggested
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeDeliverable(i)}
                  aria-label="Remove deliverable"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {tools.deliverables.length < MAX_DELIVERABLES && (
            <button
              onClick={addDeliverable}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add deliverable
            </button>
          )}

          {hasOfficeDeliverable && (
            <p className="mt-2.5 text-[10px] text-muted-foreground/60">
              Excel, PowerPoint, and Word files are produced via code execution.
            </p>
          )}
        </div>
      )}

      {error && <ErrorNote message={error} className="mt-2" />}
    </div>
  );
}
