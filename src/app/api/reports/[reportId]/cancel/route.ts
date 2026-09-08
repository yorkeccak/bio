import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  cancelDeepResearchTask,
  getDeepResearchStatus,
  isTransientValyuError,
  ValyuError,
  valyuErrorStatus,
} from "@/lib/valyu-workflows";
import { listItemToDTO, statusToDTO } from "@/lib/reports";

const minimalFromId = (reportId: string) =>
  listItemToDTO({
    taskId: reportId,
    query: "",
    title: null,
    status: "queued",
    createdAt: null,
  });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { reportId } = await params;

  let valyuAccessToken: string | undefined;
  try {
    const body = await request.json();
    valyuAccessToken =
      typeof body.valyuAccessToken === "string"
        ? body.valyuAccessToken
        : undefined;
  } catch {
    // fallback to header
  }
  valyuAccessToken =
    valyuAccessToken ||
    request.headers.get("x-valyu-access-token") ||
    undefined;

  // Cancel is best-effort. Only hard-fail on auth/permission/not-found;
  // transient or unknown cancel errors are swallowed so we can still return
  // the current task status.
  try {
    await cancelDeepResearchTask(reportId, { valyuAccessToken });
  } catch (e) {
    if (e instanceof ValyuError) {
      if (!isTransientValyuError(e) && e.status !== 401 && e.status !== 403) {
        return NextResponse.json(
          { error: e.message },
          { status: valyuErrorStatus(e) },
        );
      }
    }
  }

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
    const report = minimalFromId(reportId);
    if (e instanceof ValyuError) {
      return NextResponse.json(
        { report, error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      {
        report,
        error: e instanceof Error ? e.message : "Failed to fetch report status",
      },
      { status: 500 },
    );
  }
}
