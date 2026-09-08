"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Code2,
  FileOutput,
  Loader2,
  Plus,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@vercel/analytics";
import {
  apiCreateResearch,
  apiSuggestDeliverables,
  type DeliverableItem,
  type DeliverableType,
} from "@/lib/report-client";
import { MODES } from "@/lib/domains";
import { EXAMPLE_PROMPTS, examplePromptById } from "@/lib/example-prompts";
import { requestNotifyPermission } from "./report-notify";
import { ErrorNote } from "./error-note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DELIVERABLE_TYPES: DeliverableType[] = [
  "xlsx",
  "pptx",
  "docx",
  "csv",
  "pdf",
];
const MIN_SUGGEST_LENGTH = 20;
const SUGGEST_DEBOUNCE_MS = 800;
const MAX_DELIVERABLES = 5;
/** Types the deep research backend can only produce with code execution on. */
const CODE_BACKED_DELIVERABLES: DeliverableType[] = ["xlsx", "pptx", "docx"];

const chip = (active: boolean) =>
  `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
    active
      ? "border-transparent bg-foreground text-background"
      : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
  }`;

/**
 * The homepage research bar: one freeform question plus the depth and tool
 * knobs a Valyu deep research task accepts. Submitting launches the task and
 * hands the new report id back to the page.
 */
export function ResearchConsole({
  isAuthenticated,
  onLaunched,
  onRequireAuth,
}: {
  isAuthenticated: boolean;
  onLaunched: (reportId: string) => void;
  onRequireAuth: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("standard");
  const [charts, setCharts] = useState(true);
  const [codeExecution, setCodeExecution] = useState(false);
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [deliverablesOpen, setDeliverablesOpen] = useState(false);
  const [exampleId, setExampleId] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Grow the input with its content instead of scrolling a one-line box.
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);
  useEffect(resize, [query, resize]);
  useEffect(() => () => {
    if (typingRef.current) clearInterval(typingRef.current);
  }, []);

  /* ---- Deliverable suggestions (mirrors the /reports launcher) ---- */
  const deliverablesRef = useRef(deliverables);
  deliverablesRef.current = deliverables;
  const suggestedForRef = useRef<string | null>(null);
  const dropStale = () =>
    setDeliverables((prev) => prev.filter((d) => !d.suggested));

  useEffect(() => {
    if (launching) return;
    const q = query.trim();
    if (q.length < MIN_SUGGEST_LENGTH) {
      dropStale();
      suggestedForRef.current = null;
      return;
    }
    if (suggestedForRef.current === q) return;
    /*
      Deliberately no AbortController. Aborting an in-flight fetch throws an
      AbortError that Next's dev overlay reports as a runtime error even when
      the rejection is caught, so selecting an example and hitting enter put a
      red overlay over a perfectly healthy run. A superseded suggestion is one
      cheap request, so we let it finish and just ignore the result.
    */
    let cancelled = false;
    const timer = setTimeout(async () => {
      const suggestions = await apiSuggestDeliverables(q).catch(() => []);
      if (cancelled) return;
      suggestedForRef.current = q;
      if (!suggestions.length) {
        dropStale();
        return;
      }
      // Never clobber deliverables the user has actually edited.
      if (
        !deliverablesRef.current.every(
          (d) => d.suggested || !d.description.trim(),
        )
      )
        return;
      setDeliverables(suggestions.slice(0, MAX_DELIVERABLES));
      // Automatically enable code execution if any suggested deliverable needs it.
      if (
        suggestions.some((d) => CODE_BACKED_DELIVERABLES.includes(d.type))
      ) {
        setCodeExecution(true);
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, launching]);

  /** Types the example in rather than pasting it — same feel as the old cards. */
  const applyExample = (id: string) => {
    const example = examplePromptById(id);
    if (!example) return;
    setExampleId(id);
    track("Homepage Example Selected", { example: id });
    if (typingRef.current) clearInterval(typingRef.current);
    const text = example.prompt;
    let i = 0;
    setQuery("");
    typingRef.current = setInterval(() => {
      if (i > text.length) {
        if (typingRef.current) clearInterval(typingRef.current);
        textareaRef.current?.focus();
        return;
      }
      setQuery(text.slice(0, i));
      i += 1;
    }, 4);
  };

  const submit = async () => {
    const q = query.trim();
    if (!q || launching) return;
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setLaunching(true);
    setError(null);
    void requestNotifyPermission();
    track("Homepage Research Launched", { mode, deliverables: deliverables.length });
    try {
      const report = await apiCreateResearch(q, mode, {
        charts,
        codeExecution:
          codeExecution ||
          deliverables.some((d) => CODE_BACKED_DELIVERABLES.includes(d.type)),
        deliverables,
      });
      onLaunched(report.id);
    } catch (e) {
      setError((e as Error).message);
      setLaunching(false);
    }
  };

  const updateDeliverable = (i: number, patch: Partial<DeliverableItem>) =>
    setDeliverables((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, ...patch, suggested: false } : d)),
    );

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Question */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-3xl"
      >
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setExampleId("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          disabled={launching}
          placeholder="Ask anything — I'll run deep research and cite my sources…"
          aria-label="Research question"
          className="w-full resize-none overflow-y-auto rounded-2xl border border-border bg-card py-3 pl-5 pr-14 text-[15px] leading-6 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/25 disabled:opacity-60"
        />
        <button
          onClick={() => void submit()}
          disabled={launching || !query.trim()}
          aria-label="Start deep research"
          className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
        >
          {launching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </motion.div>

      {/* Depth + tools */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
        className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
      >
        <span className="text-[13px] text-muted-foreground">Depth</span>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.note}
            className={chip(mode === m.id)}
          >
            {m.id === "fast" && <Zap className="h-3.5 w-3.5 fill-current" strokeWidth={0} />}
            {m.label}
          </button>
        ))}

        <span className="ml-2 text-[13px] text-muted-foreground">Tools</span>
        <button onClick={() => setCharts((v) => !v)} className={chip(charts)}>
          <BarChart3 className="h-3.5 w-3.5" />
          Chart Generation
        </button>
        <button
          onClick={() => setCodeExecution((v) => !v)}
          className={chip(codeExecution)}
        >
          <Code2 className="h-3.5 w-3.5" />
          Code Execution
        </button>
        <button
          onClick={() => setDeliverablesOpen((v) => !v)}
          aria-expanded={deliverablesOpen}
          className={chip(deliverables.length > 0)}
        >
          <FileOutput className="h-3.5 w-3.5" />
          Deliverables
          {deliverables.length > 0 && (
            <span className="rounded-full bg-background/20 px-1.5 text-[11px] leading-4">
              {deliverables.length}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${deliverablesOpen ? "rotate-180" : ""}`}
          />
        </button>
      </motion.div>

      {/* Deliverables editor */}
      {deliverablesOpen && (
        <div className="mx-auto mt-3 max-w-3xl rounded-2xl border border-border bg-card p-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Deliverables</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Files generated alongside the report. Suggested from your question.
              </div>
            </div>
            <button
              onClick={() =>
                setDeliverables((prev) =>
                  prev.length >= MAX_DELIVERABLES
                    ? prev
                    : [...prev, { type: "xlsx", description: "" }],
                )
              }
              disabled={deliverables.length >= MAX_DELIVERABLES}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/25 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          {deliverables.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              None yet — add one, or keep typing and we&apos;ll suggest a set.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={d.type}
                    onChange={(e) =>
                      updateDeliverable(i, {
                        type: e.target.value as DeliverableType,
                      })
                    }
                    className="w-24 flex-shrink-0 rounded-xl border border-border bg-transparent px-2.5 py-2 text-xs text-foreground outline-none focus:border-foreground/40"
                  >
                    {DELIVERABLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <input
                    value={d.description}
                    onChange={(e) =>
                      updateDeliverable(i, { description: e.target.value })
                    }
                    placeholder="What should this file contain?"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
                  />
                  <button
                    onClick={() =>
                      setDeliverables((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    aria-label="Remove deliverable"
                    className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compact auto-attached deliverable chips */}
      {deliverables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-2 flex flex-wrap items-center justify-center gap-1.5"
        >
          {deliverables.map((d, i) => (
            <button
              key={`${d.type}-${i}`}
              onClick={() => setDeliverablesOpen(true)}
              className="group inline-flex max-w-[280px] items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-foreground/25"
              title={d.description}
            >
              <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {d.type}
              </span>
              <span className="truncate text-muted-foreground">
                {d.description}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setDeliverables((prev) =>
                    prev.filter((_, idx) => idx !== i),
                  );
                }}
                className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Starter examples — the six capabilities folded into one polished picker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-2 flex flex-wrap items-center justify-center gap-2"
      >
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[13px] text-muted-foreground">Not sure where to start?</span>
        <Select value={exampleId} onValueChange={(id) => applyExample(id)}>
          <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border bg-card px-3.5 text-[13px] font-medium text-foreground hover:border-foreground/25 focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
            <SelectValue placeholder="Pick an example…" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {EXAMPLE_PROMPTS.map((e) => (
              <SelectItem
                key={e.id}
                value={e.id}
                className="rounded-lg text-[13px]"
              >
                <span className="mr-1">{e.emoji}</span>
                {e.label}
                <span className="ml-1.5 text-muted-foreground">— {e.blurb}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {error && (
        <ErrorNote message={error} className="mx-auto mt-4 max-w-3xl text-left" />
      )}
    </div>
  );
}
