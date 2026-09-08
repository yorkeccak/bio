import { NextResponse } from "next/server";
import {
  listWorkflows,
  ValyuError,
  valyuErrorStatus,
} from "@/lib/valyu-workflows";
import { LIFE_SCIENCES_VERTICAL } from "@/lib/domains";
import { normalizeWorkflow } from "@/lib/workflow-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical") || LIFE_SCIENCES_VERTICAL;
  const valyuAccessToken =
    searchParams.get("valyuAccessToken") ||
    request.headers.get("x-valyu-access-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    undefined;

  try {
    const workflows = await listWorkflows({ vertical, valyuAccessToken });
    return NextResponse.json({ workflows: workflows.map(normalizeWorkflow) });
  } catch (e) {
    if (e instanceof ValyuError) {
      if (e.status === 401) {
        return NextResponse.json(
          { workflows: [], authExpired: true },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load workflows" },
      { status: 500 },
    );
  }
}
