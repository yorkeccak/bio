import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { parseActivityFromMessages, type ActivityItem } from "@/lib/reports";

const VALYU_API_BASE = process.env.VALYU_API_URL || "https://api.valyu.ai";
const VALYU_OAUTH_PROXY_URL =
  process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || process.env.NEXT_PUBLIC_VALYU_APP_URL || "https://platform.valyu.ai"}/api/oauth/proxy`;

export type ResearchMode = "fast" | "standard" | "heavy";
export type { ActivityItem } from "@/lib/reports";
export type TaskStatus =
  "queued" | "running" | "completed" | "failed" | "cancelled";
const TERMINAL_STATUSES: TaskStatus[] = ["completed", "failed", "cancelled"];
export function isTerminalStatus(status: string | undefined): boolean {
  return !!status && TERMINAL_STATUSES.includes(status as TaskStatus);
}
export class ValyuError extends Error {
  status?: number;
  bodyText?: string;
  constructor(message: string, status?: number, bodyText?: string) {
    super(message);
    this.name = "ValyuError";
    this.status = status;
    this.bodyText = bodyText;
  }
}
export function valyuErrorStatus(e: ValyuError): number {
  const s = e.status;
  if (s === 402) return 402;
  if (s === 401 || s === 403) return 401;
  if (s && s >= 400 && s < 500) return s;
  return 502;
}
export function isTransientValyuError(e: unknown): boolean {
  if (!(e instanceof ValyuError)) return true;
  if (e.status === undefined) return true;
  return e.status >= 500 || e.status === 429;
}
interface CallOpts {
  valyuAccessToken?: string;
}
async function valyuCall(
  path: string,
  method: "GET" | "POST" | "DELETE",
  body: unknown,
  { valyuAccessToken }: CallOpts,
): Promise<any> {
  let res: Response;
  if (isSelfHostedMode()) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey)
      throw new ValyuError("VALYU_API_KEY required in self-hosted mode", 500);
    res = await fetch(`${VALYU_API_BASE}${path}`, {
      method,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } else {
    if (!valyuAccessToken)
      throw new ValyuError("Valyu access token required", 401);
    res = await fetch(VALYU_OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${valyuAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, method, body }),
    });
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    if (res.status === 402)
      throw new ValyuError(
        "Insufficient Valyu credits. Top up your account to continue.",
        402,
        text,
      );
    if (res.status === 401)
      throw new ValyuError(
        "Valyu session expired. Please sign in again.",
        401,
        text,
      );
    if (res.status === 403)
      throw new ValyuError(
        "This Valyu feature is not available for your account.",
        403,
        text,
      );
    const msg =
      json?.error?.message ||
      json?.message ||
      json?.error ||
      `Valyu request failed (${res.status})`;
    throw new ValyuError(
      typeof msg === "string" ? msg : `Valyu request failed (${res.status})`,
      res.status,
      text,
    );
  }
  return json;
}
export async function listWorkflows(
  opts: CallOpts & { vertical?: string } = {},
): Promise<any[]> {
  const qs = new URLSearchParams({ scope: "valyu" });
  if (opts.vertical) qs.set("vertical", opts.vertical);
  const resp = await valyuCall(
    `/v1/workflows?${qs.toString()}`,
    "GET",
    undefined,
    opts,
  );
  if (Array.isArray(resp)) return resp;
  return resp?.workflows ?? resp?.data ?? resp?.results ?? [];
}
export async function getWorkflow(
  slug: string,
  opts: CallOpts = {},
): Promise<any> {
  return valyuCall(`/v1/workflows/${slug}`, "GET", undefined, opts);
}
export interface CreateTaskInput {
  workflowSlug?: string;
  workflowParams?: Record<string, unknown>;
  query?: string;
  mode: ResearchMode;
  tools?: {
    charts?: boolean;
    codeExecution?: boolean;
    deliverables?: { type: string; description?: string }[];
  };
}
export interface CreateTaskResult {
  deepresearchId: string;
  status: TaskStatus;
  workflowVersion?: number;
  raw: any;
}
const DEFAULT_DELIVERABLE_DESC: Record<string, string> = {
  csv: "Underlying data as a CSV table",
  xlsx: "Key figures and supporting data as a spreadsheet",
  pptx: "Summary presentation of the findings",
  docx: "Full written report as a Word document",
  pdf: "Full report as a PDF document",
};
export async function createDeepResearchTask(
  input: CreateTaskInput,
  opts: CallOpts = {},
): Promise<CreateTaskResult> {
  const body: Record<string, unknown> = {
    mode: input.mode,
    output_formats: ["markdown", "pdf"],
  };
  if (input.query) body.query = input.query;
  else {
    body.workflow_id = input.workflowSlug;
    body.workflow_params = input.workflowParams ?? {};
  }
  const deliverables = input.tools?.deliverables ?? [];
  const needsCodeForDeliverables = deliverables.some((d) =>
    ["xlsx", "pptx", "docx"].includes(d.type),
  );
  const wantsCharts = input.tools?.charts ?? true;
  const wantsCode = !!(input.tools?.codeExecution || needsCodeForDeliverables);
  const taskTools: Record<string, unknown> = {};
  if (wantsCharts) taskTools.charts = true;
  if (wantsCode) taskTools.code_execution = { enabled: true };
  if (Object.keys(taskTools).length > 0) body.tools = taskTools;
  if (deliverables.length > 0)
    body.deliverables = deliverables.map((d) => ({
      type: d.type,
      description:
        d.description?.trim() ||
        DEFAULT_DELIVERABLE_DESC[d.type] ||
        "Supporting deliverable",
    }));
  const resp = await valyuCall("/v1/deepresearch/tasks", "POST", body, opts);
  const deepresearchId = resp?.deepresearch_id ?? resp?.id ?? resp?.task_id;
  if (!deepresearchId)
    throw new ValyuError(
      "Valyu did not return a task id",
      502,
      JSON.stringify(resp),
    );
  return {
    deepresearchId,
    status: (resp?.status as TaskStatus) ?? "queued",
    workflowVersion: resp?.workflow?.version,
    raw: resp,
  };
}
export interface ResearchImage {
  imageUrl: string;
  title?: string | null;
  chartType?: string | null;
  imageType?: string | null;
  imageId?: string | null;
}
export interface ResearchDeliverable {
  id?: string | null;
  type: string;
  title?: string | null;
  url: string;
  description?: string | null;
  request?: string | null;
  status?: string | null;
  rowCount?: number | null;
  columnCount?: number | null;
}
export interface TaskStatusResult {
  status: TaskStatus;
  title?: string | null;
  output?: string | null;
  sources?: unknown[] | null;
  activity?: ActivityItem[];
  images?: ResearchImage[] | null;
  deliverables?: ResearchDeliverable[] | null;
  pdfUrl?: string | null;
  isPublic?: boolean;
  progress?: { current_step?: number; total_steps?: number } | null;
  usage?: unknown;
  mode?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  raw: any;
}
function mapImages(raw: unknown): ResearchImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      imageUrl: r?.image_url ?? r?.url ?? "",
      title: r?.title ?? null,
      chartType: r?.chart_type ?? null,
      imageType: r?.image_type ?? null,
      imageId: r?.image_id ?? null,
    }))
    .filter((i) => !!i.imageUrl);
}
/**
 * Coerces a task's `output` to markdown.
 *
 * The field is typed `string | null` but comes straight off the API, and some
 * tasks return it structured instead — an array of content blocks, or an object
 * wrapping the text. Older reports crashed the report view (`md.replace is not
 * a function`), so normalise here, at the boundary, rather than defending in
 * every consumer. Anything we can't read as text becomes null, which renders as
 * "no body" and leaves deliverables, charts and the PDF link intact.
 */
const TEXT_KEYS = ["markdown", "text", "content", "output", "body"] as const;

function textFrom(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => textFrom(item))
      .filter((t): t is string => !!t && t.length > 0);
    return parts.length ? parts.join("\n\n") : null;
  }
  if (value && typeof value === "object") {
    for (const key of TEXT_KEYS) {
      const inner = (value as Record<string, unknown>)[key];
      if (typeof inner === "string" && inner.length > 0) return inner;
    }
  }
  return null;
}

function mapOutput(raw: unknown): string | null {
  const text = textFrom(raw);
  return text && text.trim().length > 0 ? text : null;
}

function mapDeliverables(raw: unknown): ResearchDeliverable[] {
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown) => {
    const n =
      typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return raw
    .map((r: any) => ({
      id: r?.id ?? null,
      type: String(r?.type ?? "").toLowerCase(),
      title: r?.title ?? null,
      url: r?.url ?? "",
      description: r?.description ?? null,
      request: r?.request ?? null,
      status: r?.status ?? null,
      rowCount: num(r?.row_count),
      columnCount: num(r?.column_count),
    }))
    .filter((d) => !!d.url && !!d.type);
}
export async function getDeepResearchStatus(
  taskId: string,
  opts: CallOpts = {},
): Promise<TaskStatusResult> {
  const resp = await valyuCall(
    `/v1/deepresearch/tasks/${taskId}/status`,
    "GET",
    undefined,
    opts,
  );
  return {
    status: resp?.status as TaskStatus,
    title: resp?.title ?? null,
    output: mapOutput(resp?.output),
    sources: resp?.sources ?? null,
    activity: parseActivityFromMessages(resp?.messages),
    images: mapImages(resp?.images),
    deliverables: mapDeliverables(resp?.deliverables),
    pdfUrl: resp?.pdf_url ?? null,
    isPublic: resp?.public ?? false,
    progress: resp?.progress ?? null,
    usage: resp?.usage ?? null,
    mode: resp?.mode ?? null,
    errorMessage: resp?.error_message ?? resp?.error ?? null,
    createdAt: resp?.created_at ?? null,
    completedAt: resp?.completed_at ?? null,
    raw: resp,
  };
}
export async function cancelDeepResearchTask(
  taskId: string,
  opts: CallOpts = {},
): Promise<void> {
  await valyuCall(`/v1/deepresearch/tasks/${taskId}/cancel`, "POST", {}, opts);
}
export async function deleteDeepResearchTask(
  taskId: string,
  opts: CallOpts = {},
): Promise<void> {
  await valyuCall(
    `/v1/deepresearch/tasks/${taskId}/delete`,
    "DELETE",
    undefined,
    opts,
  );
}
export interface DeepResearchListItem {
  taskId: string;
  query: string;
  title: string | null;
  status: TaskStatus;
  createdAt: string | null;
}
export async function listDeepResearchTasks(
  opts: CallOpts = {},
  limit = 100,
): Promise<DeepResearchListItem[]> {
  const resp = await valyuCall(
    `/v1/deepresearch/list?limit=${limit}`,
    "GET",
    undefined,
    opts,
  );
  const arr = Array.isArray(resp)
    ? resp
    : (resp?.tasks ?? resp?.data ?? resp?.results ?? []);
  return (arr as any[])
    .map((t) => ({
      taskId: t?.deepresearch_id ?? t?.id ?? t?.task_id,
      query: t?.query ?? "",
      title: t?.title ?? null,
      status: (t?.status ?? "queued") as TaskStatus,
      createdAt: t?.created_at ?? null,
    }))
    .filter((t) => !!t.taskId);
}
