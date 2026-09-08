import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  listDeepResearchTasks,
  ValyuError,
  valyuErrorStatus,
} from "@/lib/valyu-workflows";
import { listItemToDTO } from "@/lib/reports";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const valyuAccessToken =
    (typeof body.valyuAccessToken === "string"
      ? body.valyuAccessToken
      : undefined) ||
    request.headers.get("x-valyu-access-token") ||
    undefined;

  try {
    const tasks = await listDeepResearchTasks({ valyuAccessToken });
    return NextResponse.json({ reports: tasks.map(listItemToDTO) });
  } catch (e) {
    if (e instanceof ValyuError) {
      if (e.status === 401) {
        return NextResponse.json({ reports: [], authExpired: true });
      }
      if (e.status === 429 || (e.status ?? 0) >= 500) {
        return NextResponse.json({ reports: [], syncError: e.message });
      }
      return NextResponse.json(
        { error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load history" },
      { status: 500 },
    );
  }
}
