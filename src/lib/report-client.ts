import { createClient } from "@/utils/supabase/client-wrapper";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import type { ReportDTO } from "@/lib/reports";

export interface AuthBundle {
  headers: Record<string, string>;
  valyuAccessToken?: string;
}

export async function buildAuth(): Promise<AuthBundle> {
  const headers: Record<string, string> = {};
  let valyuAccessToken: string | undefined;

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // self-hosted / no supabase
  }

  try {
    const state = useAuthStore.getState();
    valyuAccessToken =
      state.getValyuAccessToken?.() ?? state.valyuAccessToken ?? undefined;
  } catch {
    // no valyu session
  }

  if (valyuAccessToken) {
    headers["x-valyu-access-token"] = valyuAccessToken;
  }

  return { headers, valyuAccessToken };
}

export function errorFromResponse(
  res: Response,
  body: { error?: string; message?: string },
  fallback: string,
): Error {
  if (res.status === 429) {
    return new Error(
      "You're sending requests too quickly. Wait a few seconds and try again.",
    );
  }
  if (res.status === 402) {
    return new Error(
      body.error ||
        body.message ||
        "Insufficient Valyu credits. Top up your account to continue.",
    );
  }
  if (res.status === 401) {
    return new Error(
      body.error === "AUTH_REQUIRED"
        ? body.message || "Sign in with Valyu to run research."
        : body.message ||
            body.error ||
            "Your session expired. Please sign in again.",
    );
  }
  return new Error(body.error || body.message || fallback);
}

export async function apiReportHistory(): Promise<ReportDTO[]> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch("/api/reports/history", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw errorFromResponse(res, json, "Failed to load history");
  if (json.syncError && (json.reports?.length ?? 0) === 0) {
    throw new Error(json.syncError);
  }
  if (json.authExpired) {
    throw new Error("Your Valyu session expired. Please sign in again.");
  }
  return json.reports ?? [];
}

export async function apiListReports(): Promise<ReportDTO[]> {
  return apiReportHistory();
}

export interface CreateReportInput {
  workflow_slug: string;
  workflow_params: Record<string, unknown>;
  mode: string;
  title: string;
  estimated_time?: string;
}

export async function apiCreateReport(
  input: CreateReportInput,
): Promise<ReportDTO> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw errorFromResponse(res, json, "Failed to start report");
  return json.report;
}

export type DeliverableType = "csv" | "xlsx" | "pptx" | "docx" | "pdf";

export interface DeliverableItem {
  type: DeliverableType;
  description: string;
  suggested?: boolean;
}

export interface ResearchTools {
  charts?: boolean;
  codeExecution?: boolean;
  deliverables?: DeliverableItem[];
}

export async function apiSuggestDeliverables(
  query: string,
): Promise<DeliverableItem[]> {
  try {
    const res = await fetch("/api/deliverables/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.suggestions ?? []).map(
      (s: { type: DeliverableType; description: string }) => ({
        type: s.type,
        description: s.description,
        suggested: true,
      }),
    );
  } catch {
    return [];
  }
}

export async function apiCreateResearch(
  query: string,
  mode: string,
  tools?: ResearchTools,
): Promise<ReportDTO> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode, valyuAccessToken, tools }),
  });
  const json = await res.json();
  if (!res.ok) throw errorFromResponse(res, json, "Failed to start research");
  return json.report;
}

export async function apiCancelReport(reportId: string): Promise<ReportDTO> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}/cancel`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to cancel");
  return json.report;
}

export async function apiSyncReport(reportId: string): Promise<{
  report: ReportDTO;
  progress?: { current_step?: number; total_steps?: number } | null;
  transient?: boolean;
  syncError?: string;
  authExpired?: boolean;
}> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}/sync`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw errorFromResponse(res, json, "Failed to sync report");
  if (json.authExpired) {
    throw new Error("Your Valyu session expired. Please sign in again.");
  }
  return json;
}

export async function apiDeleteReport(reportId: string): Promise<void> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Failed to delete report");
  }
}

export async function apiDownloadReportPdf(
  reportId: string,
  filename: string,
): Promise<void> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}/pdf`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "PDF export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Deliverable file types per report, for the reports list.
 *
 * The Valyu history endpoint omits deliverables, so these are fetched in one
 * batch and memoised in localStorage — a finished run's deliverables never
 * change, so each report costs exactly one lookup for the life of the browser.
 */

const DELIVERABLES_CACHE_KEY = "reports.deliverableTypes.v2";
/**
 * A report can reach "completed" a moment before its files finish generating,
 * so an empty answer is only trusted for a short while. A report that really
 * produced nothing costs one cheap re-check per window; one that produced
 * files is cached for good.
 */
const EMPTY_TTL_MS = 10 * 60 * 1000;

export type DeliverableSummaries = Record<string, string[]>;

interface CacheEntry {
  types: string[];
  at: number;
}

function readDeliverableCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(DELIVERABLES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDeliverableCache(cache: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(DELIVERABLES_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Private mode / quota — the summaries just get refetched next visit.
  }
}

const isFresh = (entry: CacheEntry | undefined, now: number): boolean =>
  !!entry && (entry.types.length > 0 || now - entry.at < EMPTY_TTL_MS);

/**
 * Returns deliverable types for every id, fetching only the ones not already
 * cached. Ids the API can't resolve are simply absent from the result.
 */
export async function apiReportDeliverableSummaries(
  ids: string[],
): Promise<DeliverableSummaries> {
  const now = Date.now();
  const cache = readDeliverableCache();
  const flatten = (): DeliverableSummaries =>
    Object.fromEntries(
      ids.filter((id) => cache[id]).map((id) => [id, cache[id].types]),
    );

  const missing = ids.filter((id) => !isFresh(cache[id], now));
  if (!missing.length) return flatten();

  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch("/api/reports/deliverables", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ids: missing, valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok || json.authExpired) return flatten();

  for (const [id, types] of Object.entries(json.summaries ?? {})) {
    if (Array.isArray(types)) cache[id] = { types: types as string[], at: now };
  }
  writeDeliverableCache(cache);
  return flatten();
}
