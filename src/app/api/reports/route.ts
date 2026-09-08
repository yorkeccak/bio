import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  createDeepResearchTask,
  ValyuError,
  valyuErrorStatus,
} from "@/lib/valyu-workflows";
import { listItemToDTO, statusToDTO, deriveTitle } from "@/lib/reports";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const workflowSlug =
    typeof body.workflow_slug === "string" ? body.workflow_slug.trim() : "";
  const hasQuery = query.length > 0;
  const hasWorkflow = workflowSlug.length > 0;

  if ((hasQuery && hasWorkflow) || (!hasQuery && !hasWorkflow)) {
    return NextResponse.json(
      { error: "Provide either query or workflow_slug" },
      { status: 400 },
    );
  }

  const mode = ["fast", "standard", "heavy"].includes(body.mode)
    ? body.mode
    : "standard";
  const valyuAccessToken = body.valyuAccessToken as string | undefined;

  // Validate deliverables shape so the API client never throws on bad input.
  const rawTools = body.tools;
  const tools = rawTools
    ? {
        charts: !!rawTools.charts,
        codeExecution: !!rawTools.codeExecution,
        deliverables: Array.isArray(rawTools.deliverables)
          ? rawTools.deliverables
              .filter(
                (d: any) =>
                  d &&
                  typeof d.type === "string" &&
                  typeof d.description === "string",
              )
              .map((d: any) => ({ type: d.type, description: d.description }))
          : undefined,
      }
    : undefined;

  const workflowParams =
    body.workflow_params && typeof body.workflow_params === "object"
      ? (body.workflow_params as Record<string, unknown>)
      : {};

  try {
    const task = await createDeepResearchTask(
      {
        query: hasQuery ? query : undefined,
        workflowSlug: hasWorkflow ? workflowSlug : undefined,
        workflowParams: hasWorkflow ? workflowParams : undefined,
        mode,
        tools: tools as any,
      },
      { valyuAccessToken },
    );

    const base = listItemToDTO({
      taskId: task.deepresearchId,
      query: hasQuery ? query : null,
      title: body.title ?? null,
      status: task.status,
      createdAt: null,
    });

    const report = statusToDTO(
      task.deepresearchId,
      {
        status: task.status,
        title: body.title || deriveTitle(query),
        raw: task.raw,
      } as any,
      base,
    );

    report.workflow_slug = hasQuery ? "freeform" : workflowSlug;
    report.workflow_version = task.workflowVersion ?? null;
    report.workflow_params = hasWorkflow ? workflowParams : {};
    report.estimated_time = body.estimated_time ?? null;

    return NextResponse.json({ report });
  } catch (e) {
    if (e instanceof ValyuError) {
      return NextResponse.json(
        { error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to start report" },
      { status: 500 },
    );
  }
}
