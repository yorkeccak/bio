"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ChevronDown, Plus, BarChart3, Code2, X } from "lucide-react";
import { apiCreateResearch, apiSuggestDeliverables } from "@/lib/report-client";
import { requestNotifyPermission } from "./report-notify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { DeliverableItem, DeliverableType } from "@/lib/report-client";

const MODES = [
  { id: "fast", label: "Fast" },
  { id: "standard", label: "Standard" },
  { id: "heavy", label: "Heavy" },
];
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

export function ResearchLauncher({
  onLaunched,
}: {
  onLaunched: (reportId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("standard");
  const [charts, setCharts] = useState(true);
  const [codeExecution, setCodeExecution] = useState(false);
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    // No AbortController here either - see research-console.tsx: an aborted
    // fetch surfaces as a runtime error overlay in dev even when handled.
    let cancelled = false;
    const timer = setTimeout(async () => {
      const suggestions = await apiSuggestDeliverables(q).catch(() => []);
      if (cancelled) return;
      suggestedForRef.current = q;
      if (!suggestions.length) {
        dropStale();
        return;
      }
      if (
        !deliverablesRef.current.every(
          (d) => d.suggested || !d.description.trim(),
        )
      )
        return;
      setDeliverables(suggestions.slice(0, MAX_DELIVERABLES));
      setOpen(true);
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, launching]);
  const submit = async () => {
    const q = query.trim();
    if (!q) return;
    setLaunching(true);
    setError(null);
    void requestNotifyPermission();
    try {
      const report = await apiCreateResearch(q, mode, {
        charts,
        codeExecution:
          codeExecution ||
          deliverables.some(
            (d) => DELIVERABLE_TYPES.includes(d.type) && d.type !== "csv",
          ),
        deliverables,
      });
      onLaunched(report.id);
    } catch (e) {
      setError((e as Error).message);
      setLaunching(false);
    }
  };
  const update = (i: number, patch: Partial<DeliverableItem>) =>
    setDeliverables((prev) =>
      prev.map((d, idx) =>
        idx === i ? { ...d, ...patch, suggested: false } : d,
      ),
    );
  return (
    <Card className="mx-auto w-full max-w-3xl p-4">
      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask anything…"
        rows={4}
        className="min-h-[140px]"
        disabled={launching}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={charts ? "default" : "outline"}
          size="sm"
          onClick={() => setCharts((v) => !v)}
        >
          <BarChart3 className="h-4 w-4" />
          Charts
        </Button>
        <Button
          variant={codeExecution ? "default" : "outline"}
          size="sm"
          onClick={() => setCodeExecution((v) => !v)}
        >
          <Code2 className="h-4 w-4" />
          Code
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} />
          Deliverables
        </Button>
      </div>
      {open && (
        <div className="mt-3 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Deliverables</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setDeliverables((prev) =>
                  prev.length >= MAX_DELIVERABLES
                    ? prev
                    : [...prev, { type: "xlsx", description: "" }],
                )
              }
            >
              <Plus className="h-4 w-4" />
              Add deliverable
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {deliverables.map((d, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr_auto] gap-2">
                <Select
                  value={d.type}
                  onValueChange={(v) =>
                    update(i, { type: v as DeliverableType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={d.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Description"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setDeliverables((prev) =>
                      prev.filter((_, idx) => idx !== i),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={launching || !query.trim()}>
          {launching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Launch
        </Button>
      </div>
    </Card>
  );
}
