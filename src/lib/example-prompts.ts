/**
 * The six starter capabilities shown on the homepage (as a "Start from an
 * example" picker) and in the chat empty state. Pure data module so both
 * surfaces stay in sync — edit a prompt once, it changes everywhere.
 */

export interface ExamplePrompt {
  /** Stable id, used as the select value. */
  id: string;
  emoji: string;
  label: string;
  /** One-line description of what the capability does. */
  blurb: string;
  /** Full text dropped into the input when the example is picked. */
  prompt: string;
  /** The multi-tool showcase — rendered with accent styling. */
  featured?: boolean;
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    id: "pharmacokinetics",
    emoji: "🐍",
    label: "Pharmacokinetics",
    blurb: "Advanced Python modeling & calculations",
    prompt:
      "Calculate the half-life of warfarin based on plasma concentrations: 8mg/L at 0 hours, 4mg/L at 36 hours. Use Python to determine the elimination rate constant, volume of distribution, and clearance. Visualize the concentration-time curve with confidence intervals.",
  },
  {
    id: "clinical-trials",
    emoji: "🧬",
    label: "Clinical Trials",
    blurb: "Phase data & efficacy analysis",
    prompt:
      "Search for recent Phase 3 clinical trials investigating CAR-T therapy for melanoma. Extract key endpoints, patient populations, and efficacy results. Compare different CAR-T constructs and their response rates.",
  },
  {
    id: "literature-analysis",
    emoji: "📚",
    label: "Literature Analysis",
    blurb: "PubMed research & meta-analysis",
    prompt:
      "Find recent PubMed papers on CRISPR gene editing safety in human trials. Create a CSV with study details, adverse events, off-target effects, and success rates. Generate charts showing safety trends over time and correlation with delivery methods.",
  },
  {
    id: "drug-interactions",
    emoji: "💊",
    label: "Drug Interactions",
    blurb: "FDA labels & safety data",
    prompt:
      "Search FDA drug labels for interactions between metformin, lisinopril, and atorvastatin. Identify contraindications, dosing adjustments, and mechanism of interactions. Create a comprehensive CSV with interaction severity, clinical significance, and monitoring recommendations.",
  },
  {
    id: "comparative-study",
    emoji: "📊",
    label: "Comparative Study",
    blurb: "Multi-drug comparison with charts",
    prompt:
      "Compare efficacy rates of the 5 major COVID-19 vaccines (Pfizer, Moderna, AstraZeneca, J&J, Novavax). Create a CSV with trial data: efficacy percentages, sample sizes, variant coverage, and adverse event rates. Generate visualizations showing: 1) Efficacy comparison by variant, 2) Safety profiles, 3) Durability of protection over time.",
  },
  {
    id: "deep-investigation",
    emoji: "🚀",
    label: "Deep Investigation",
    blurb: "Multi-source research + Trial data + Efficacy analysis",
    featured: true,
    prompt:
      "Do an in-depth analysis of pembrolizumab (Keytruda) for non-small cell lung cancer. Search clinical trials for efficacy data, find PubMed papers on mechanism of action and biomarkers, review FDA drug label for dosing and contraindications. Use Python to analyze trial data and create comprehensive CSV with: Trial phase, patient population, PD-L1 expression levels, response rates, progression-free survival, overall survival, and adverse events. Generate charts comparing outcomes across different patient subgroups.",
  },
];

export const examplePromptById = (id: string): ExamplePrompt | undefined =>
  EXAMPLE_PROMPTS.find((e) => e.id === id);
