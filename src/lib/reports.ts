/**
 * Shared report types + mappers.
 */

import type {
  DeepResearchListItem,
  TaskStatusResult,
  ResearchImage,
  ResearchDeliverable,
} from "@/lib/valyu-workflows";

export interface ReportDTO {
  id: string;
  workflow_slug: string;
  workflow_version: number | null;
  workflow_params: Record<string, unknown>;
  query: string | null;
  mode: string;
  title: string;
  estimated_time: string | null;
  valyu_task_id: string | null;
  status: string;
  output: string | null;
  sources: unknown[] | null;
  activity: ActivityItem[] | null;
  images: ResearchImage[] | null;
  deliverables: ResearchDeliverable[] | null;
  pdf_url: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

export interface ActivitySource {
  source_id?: string;
  title?: string;
  url?: string;
  content?: string;
}

export type ActivityItem =
  | { kind: "reasoning"; text: string }
  | { kind: "text"; text: string }
  | { kind: "step"; objective: string; sources: ActivitySource[] }
  | { kind: "code"; code: string; output: string | null }
  | {
      kind: "chart";
      title: string;
      chartType: string | null;
      imageUrl: string | null;
    };

export function parseActivityFromMessages(messages: any): ActivityItem[] {
  if (!Array.isArray(messages)) return [];
  const resultByCall = new Map<string, any>();
  for (const msg of messages) {
    const content = Array.isArray(msg?.content) ? msg.content : [];
    for (const part of content) {
      if (part?.type === "tool-result")
        resultByCall.set(
          part.toolCallId,
          part?.output?.value ?? part?.output ?? null,
        );
    }
  }
  const sourcesFrom = (value: any): ActivitySource[] => {
    const raw = value?.sources ?? [];
    return Array.isArray(raw)
      ? raw.map((s: any) => ({
          source_id: s?.source_id,
          title: s?.title,
          url: s?.url,
          content: s?.content ?? s?.summary ?? s?.description,
        }))
      : [];
  };
  const items: ActivityItem[] = [];
  for (const msg of messages) {
    if (msg?.role !== "assistant") continue;
    const content = Array.isArray(msg?.content) ? msg.content : [];
    for (const part of content) {
      if (part?.type === "reasoning" && part.text?.trim())
        items.push({ kind: "reasoning", text: part.text });
      else if (part?.type === "text" && part.text?.trim())
        items.push({ kind: "text", text: part.text });
      else if (part?.type === "tool-call") {
        const tool = part?.toolName ?? part?.tool_name;
        const input = part?.input ?? part?.args ?? {};
        const value = resultByCall.get(part.toolCallId);
        if (tool === "execute_code") {
          const output =
            typeof value?.output === "string"
              ? value.output
              : typeof value === "string"
                ? value
                : value != null
                  ? JSON.stringify(value, null, 2)
                  : null;
          items.push({ kind: "code", code: String(input?.code ?? ""), output });
        } else if (tool === "createChart") {
          items.push({
            kind: "chart",
            title: input?.title ?? "Chart",
            chartType: input?.chart_type ?? null,
            imageUrl: value?.imageUrl ?? value?.image_url ?? null,
          });
        } else {
          items.push({
            kind: "step",
            objective: input?.objective ?? input?.query ?? "Research",
            sources: sourcesFrom(value),
          });
        }
      }
    }
  }
  return items;
}

export function deriveTitle(q: string | null | undefined): string {
  const trimmed = (q ?? "").trim();
  if (!trimmed) return "Research";
  return trimmed.slice(0, 80) + (trimmed.length > 80 ? "…" : "");
}

export function listItemToDTO(item: DeepResearchListItem): ReportDTO {
  return {
    id: item.taskId,
    workflow_slug: "freeform",
    workflow_version: null,
    workflow_params: {},
    query: item.query ?? null,
    mode: "standard",
    title: item.title || deriveTitle(item.query),
    estimated_time: null,
    valyu_task_id: item.taskId,
    status: item.status,
    output: null,
    sources: null,
    activity: null,
    images: null,
    deliverables: null,
    pdf_url: null,
    error_message: null,
    created_at: item.createdAt ?? null,
    updated_at: null,
    completed_at: null,
  };
}

export function statusToDTO(
  taskId: string,
  status: TaskStatusResult,
  base?: ReportDTO,
): ReportDTO {
  return {
    id: taskId,
    workflow_slug: base?.workflow_slug ?? "freeform",
    workflow_version: base?.workflow_version ?? null,
    workflow_params: base?.workflow_params ?? {},
    query: base?.query ?? null,
    mode: status.mode ?? base?.mode ?? "standard",
    title: status.title || base?.title || "Research",
    estimated_time: base?.estimated_time ?? null,
    valyu_task_id: taskId,
    status: status.status,
    output: status.output ?? null,
    sources: status.sources ?? null,
    activity:
      status.activity && status.activity.length > 0
        ? status.activity
        : (base?.activity ?? null),
    images:
      status.images && status.images.length > 0
        ? status.images
        : (base?.images ?? null),
    deliverables:
      status.deliverables && status.deliverables.length > 0
        ? status.deliverables
        : (base?.deliverables ?? null),
    pdf_url: status.pdfUrl ?? null,
    error_message: status.errorMessage ?? null,
    created_at: status.createdAt ?? base?.created_at ?? null,
    updated_at: null,
    completed_at: status.completedAt ?? null,
  };
}

export const TERMINAL = ["completed", "failed", "cancelled"] as const;
export const isTerminal = (status: string) => TERMINAL.includes(status as any);
