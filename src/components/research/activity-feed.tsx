"use client";

import {
  Brain,
  Search,
  Check,
  ExternalLink,
  Telescope,
  ChevronDown,
  Code2,
  BarChart3,
} from "lucide-react";
import { getFaviconUrl, getHostname } from "@/lib/favicon";
import type { ActivityItem, ActivitySource } from "@/lib/reports";

export function ActivityFeed({
  activity,
  running,
}: {
  activity: ActivityItem[] | null | undefined;
  running?: boolean;
}) {
  const items = activity ?? [];
  if (items.length === 0) return running ? <EmptyState /> : null;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <ActivityRow key={i} item={item} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <Telescope className="mx-auto mb-3 h-5 w-5 text-primary" />
      <p className="text-sm font-medium">Agent is researching your query…</p>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  if (item.kind === "reasoning" || item.kind === "text")
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary/90">
          <Brain className="h-3.5 w-3.5" />
          {item.kind === "reasoning" ? "Reasoning" : "Note"}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {item.text}
        </p>
      </div>
    );
  if (item.kind === "code")
    return (
      <details className="group overflow-hidden rounded-2xl border border-border bg-muted/30">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <Code2 className="h-3 w-3" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Code execution
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {item.code.split("\n").find((l) => l.trim()) ?? "Ran code"}
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border">
          <pre className="overflow-x-auto px-4 py-3 text-[12px]">
            <code>{item.code.trim()}</code>
          </pre>
          {item.output && (
            <pre className="overflow-x-auto border-t border-border px-4 pb-3 pt-1 text-[12px] whitespace-pre-wrap text-foreground/80">
              {item.output.trim()}
            </pre>
          )}
        </div>
      </details>
    );
  if (item.kind === "chart")
    return (
      <details className="group overflow-hidden rounded-2xl border border-border bg-muted/30">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <BarChart3 className="h-3 w-3" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Chart
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {item.title}
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border p-4">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-auto w-full rounded-lg bg-white"
            />
          ) : (
            <p className="text-xs text-muted-foreground">Chart generated.</p>
          )}
        </div>
      </details>
    );
  return (
    <details className="group overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 hover:bg-primary/[0.06] [&::-webkit-details-marker]:hidden">
        <Check className="h-3 w-3 text-primary" strokeWidth={3} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          research
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {item.objective}
        </span>
        {item.sources.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Search className="h-3 w-3" /> {item.sources.length}
          </span>
        )}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-primary/15 p-4">
        <div className="space-y-1.5">
          {item.sources.map((s, i) => (
            <SourceCard
              key={`${s.url ?? s.source_id ?? "src"}-${i}`}
              source={s}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

function SourceCard({ source }: { source: ActivitySource }) {
  const url = source.url ?? "";
  const host = url ? getHostname(url) : "";
  const favicon = url ? getFaviconUrl(url) : "";
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {favicon ? (
          <img src={favicon} alt="" className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">
          {source.title || host || "Source"}
          {host && (
            <span className="font-normal text-muted-foreground"> · {host}</span>
          )}
        </div>
        {source.content && (
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {source.content}
          </div>
        )}
      </div>
    </a>
  ) : null;
}
