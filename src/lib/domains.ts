/**
 * Domain lenses for the reports page. Valyu groups its prebuilt workflows by
 * vertical; this app only surfaces "life-sciences", so the lenses below are
 * local groupings of that vertical's workflow slugs. Pure module — safe to
 * import on client and server.
 */

/** The only Valyu vertical this app surfaces. */
export const LIFE_SCIENCES_VERTICAL = "life-sciences";

/** The lenses we surface (every DOMAINS entry except the synthetic "all"). */
export const LIFE_SCIENCES_LENSES = [
  "pipeline",
  "clinical",
  "regulatory",
  "bd",
] as const;

export type LifeSciencesLens = (typeof LIFE_SCIENCES_LENSES)[number];

export interface Domain {
  id: string; // "all" or a lens id
  label: string;
  blurb: string;
  /** Workflow slugs in this lens. Empty for the synthetic "all" lens. */
  slugs: string[];
}

export const DOMAINS: Domain[] = [
  {
    id: "all",
    label: "All",
    blurb: "Every life sciences workflow",
    slugs: [],
  },
  {
    id: "pipeline",
    label: "Pipeline & Assets",
    blurb: "Competitive landscapes, pipelines, target classes",
    slugs: [
      "ls-drug-competitive-landscape",
      "ls-pipeline-analysis",
      "ls-mechanism-deep-dive",
    ],
  },
  {
    id: "clinical",
    label: "Clinical",
    blurb: "Trials, readouts and investigators",
    slugs: ["ls-clinical-trial-tracker", "ls-kol-mapping"],
  },
  {
    id: "regulatory",
    label: "Regulatory & Access",
    blurb: "FDA / EMA pathways, payers and pricing",
    slugs: ["ls-regulatory-pathway", "ls-payer-landscape"],
  },
  {
    id: "bd",
    label: "BD & Deals",
    blurb: "M&A screens and partnering targets",
    slugs: ["ls-bio-ma-screen"],
  },
];

const LENS_FOR_SLUG: Record<string, string> = Object.fromEntries(
  DOMAINS.flatMap((d) => d.slugs.map((slug) => [slug, d.id])),
);

/** Lens a workflow belongs to, or undefined for slugs we haven't grouped. */
export const lensForSlug = (slug: string): string | undefined =>
  LENS_FOR_SLUG[slug];

export const domainLabel = (id: string): string | undefined =>
  DOMAINS.find((d) => d.id === id)?.label;

/**
 * Run modes. A depth knob, not a speed knob — the per-workflow
 * `estimated_time` is the real ETA.
 */
export interface ModeOption {
  id: string;
  label: string;
  note: string;
}

export const MODES: ModeOption[] = [
  { id: "fast", label: "Fast", note: "Lighter, fastest" },
  { id: "standard", label: "Standard", note: "Recommended depth" },
  { id: "heavy", label: "Heavy", note: "Deepest analysis" },
];
