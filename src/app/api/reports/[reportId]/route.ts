import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  deleteDeepResearchTask,
  getDeepResearchStatus,
  ValyuError,
  valyuErrorStatus,
} from "@/lib/valyu-workflows";
import { listItemToDTO, statusToDTO } from "@/lib/reports";

function tokenFromRequest(request: Request, body?: any): string | undefined {
  return (
    (typeof body?.valyuAccessToken === "string"
      ? body.valyuAccessToken
      : undefined) ||
    request.headers.get("x-valyu-access-token") ||
    new URL(request.url).searchParams.get("valyuAccessToken") ||
    undefined
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { reportId } = await params;
  const valyuAccessToken = tokenFromRequest(request);

  try {
    const status = await getDeepResearchStatus(reportId, { valyuAccessToken });
    return NextResponse.json({
      report: statusToDTO(
        reportId,
        status,
        listItemToDTO({
          taskId: reportId,
          query: "",
          title: null,
          status: status.status,
          createdAt: status.createdAt ?? null,
        }),
      ),
    });
  } catch (e) {
    if (e instanceof ValyuError) {
      return NextResponse.json(
        { error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load report" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { reportId } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const valyuAccessToken = tokenFromRequest(request, body);

  try {
    await deleteDeepResearchTask(reportId, { valyuAccessToken });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValyuError) {
      return NextResponse.json(
        { error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete report" },
      { status: 500 },
    );
  }
}
