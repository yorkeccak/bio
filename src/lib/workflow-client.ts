/** Client helpers for the Valyu workflow catalog. */

import { buildAuth } from "@/lib/report-client";
import type { WorkflowDTO } from "@/lib/workflow-types";

export async function apiListWorkflows(
  vertical?: string,
): Promise<WorkflowDTO[]> {
  const { headers } = await buildAuth();
  const qs = vertical ? `?vertical=${encodeURIComponent(vertical)}` : "";
  const res = await fetch(`/api/workflows${qs}`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load workflows");
  return json.workflows ?? [];
}
