/**
 * Seeded example reports — one flagship per lens. These are real, cached
 * Valyu workflow runs captured to static JSON (see scripts/gen-seeds.mjs) and
 * shipped in the bundle. They're the trust layer: users see output quality
 * before spending a credit.
 */

import pipeline from "./pipeline.json";
import clinical from "./clinical.json";
import regulatory from "./regulatory.json";
import bd from "./bd.json";

export interface ExampleReport {
  domainId: string;
  workflow_slug: string;
  title: string;
  subject: string;
  mode: string;
  estimated_time: string | null;
  output: string;
  sources_count: number;
  pdf_url?: string | null;
  task_id: string | null;
}

const ALL: ExampleReport[] = [
  pipeline as ExampleReport,
  clinical as ExampleReport,
  regulatory as ExampleReport,
  bd as ExampleReport,
];

const BY_DOMAIN: Record<string, ExampleReport> = Object.fromEntries(
  ALL.map((e) => [e.domainId, e]),
);

/** The example for a lens, or null. "Ready" = has captured output. */
export function getExample(domainId: string): ExampleReport | null {
  return BY_DOMAIN[domainId] ?? null;
}

export function isExampleReady(e: ExampleReport | null): e is ExampleReport {
  return !!e && typeof e.output === "string" && e.output.length > 0;
}
