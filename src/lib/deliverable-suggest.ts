import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const SUGGESTIBLE_TYPES = ["csv", "xlsx", "pptx", "docx"] as const;
export type SuggestibleType = (typeof SUGGESTIBLE_TYPES)[number];
export interface DeliverableSuggestion {
  type: SuggestibleType;
  description: string;
}
const MAX_SUGGESTIONS = 3;
const MIN_QUERY_LENGTH = 20;
const TIMEOUT_MS = 10000;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_QUERY_CHARS = 1000;
const model = process.env.DELIVERABLE_SUGGEST_MODEL || "gpt-5.6-luna";

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({ type: z.enum(SUGGESTIBLE_TYPES), description: z.string() }),
  ),
});

const SYSTEM_PROMPT = `You decide whether a biomedical or scientific research request implies the user wants a downloadable file, and if so, what should go in it.

Suggest a deliverable ONLY when the request implies a tangible artifact:
- xlsx: a data model, analysis workbook, or multi-sheet scientific table
- csv: a single flat table of data
- pptx: a slide deck, presentation, or poster-style summary
- docx: a written memo, report, protocol summary, or document

Return an EMPTY list when the request just wants an answer, a number, an explanation, or a view. Be conservative: a wrong suggestion costs the user credits and time.

When you do suggest one, the description is the important part. It is passed to the research engine to steer what the file contains.
- Name the actual biomarkers, genes, diseases, cohorts, interventions, endpoints, assays, or periods from the request.
- Describe the CONTENTS, not the format.
- One sentence, under 200 characters.
- Never write something generic.

Suggest at most 3, and usually 0 or 1.
Always answer with an object holding a "suggestions" array.

Examples:

Request: "What is the latest guidance on GLP-1 adverse event rates?"
{"suggestions": []}

Request: "Compare CRISPR trial outcomes for sickle cell disease vs beta thalassemia"
{"suggestions": []}

Request: "Build a spreadsheet of biomarker levels across treatment arms and timepoints"
{"suggestions": [{"type": "xlsx", "description": "Workbook with biomarker levels by treatment arm, visit date and assay result"}]}

Request: "Create a clinical study summary deck on long COVID therapeutics"
{"suggestions": [{"type": "pptx", "description": "Slide deck summarising long COVID therapeutic candidates, outcomes and safety findings"}]}`;

export async function suggestDeliverables(
  query: string,
): Promise<DeliverableSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];
  try {
    const openai = createOpenAI({ apiKey });
    const { object } = await generateObject({
      model: openai(model),
      schema: suggestionSchema,
      system: SYSTEM_PROMPT,
      prompt: `Request: ${trimmed.slice(0, MAX_QUERY_CHARS)}`,
      temperature: 0,
      providerOptions: { openai: { reasoningEffort: "none" } },
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return (object.suggestions ?? [])
      .map((s) => ({
        type: s.type,
        description: s.description.trim().slice(0, MAX_DESCRIPTION_LENGTH),
      }))
      .filter((s) => s.description.length > 0)
      .slice(0, MAX_SUGGESTIONS);
  } catch (error) {
    console.warn(
      "[deliverable-suggest] suggestion failed, continuing without one:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
