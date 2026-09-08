import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
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
    // Fallback to header if body is unavailable.
  }
  valyuAccessToken =
    valyuAccessToken ||
    request.headers.get("x-valyu-access-token") ||
    undefined;

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
      progress: status.progress ?? null,
      transient: false,
    });
  } catch (e) {
    const report = minimalFromId(reportId);

    if (e instanceof ValyuError) {
      if (e.status === 401) {
        return NextResponse.json({ report, authExpired: true });
      }
      if (isTransientValyuError(e)) {
        return NextResponse.json({
          report,
          transient: true,
          syncError: e.message,
        });
      }
      return NextResponse.json(
        { report, syncError: e.message },
        { status: valyuErrorStatus(e) },
      );
    }

    return NextResponse.json(
      {
        report,
        syncError: e instanceof Error ? e.message : "Failed to sync report",
      },
      { status: 500 },
    );
  }
}
