import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  getDeepResearchStatus,
  ValyuError,
  valyuErrorStatus,
} from "@/lib/valyu-workflows";

/**
 * Deliverable summaries for a batch of reports.
 *
 * Valyu's `/deepresearch/list` carries no deliverable data, so the reports list
 * has no way to show "this run produced files" without asking per task. This
 * route fans out over the ids and returns just the deliverable types, letting
 * the client cache one tiny record per finished report instead of a full status
 * payload.
 */

const MAX_IDS = 50;
const CONCURRENCY = 5;

/** Runs `worker` over `items` with a fixed number of in-flight requests. */
async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const ids: string[] = Array.isArray(body.ids)
    ? Array.from(
        new Set<string>(
          body.ids.filter(
            (id: unknown): id is string => typeof id === "string" && !!id,
          ),
        ),
      ).slice(0, MAX_IDS)
    : [];
  if (!ids.length) return NextResponse.json({ summaries: {} });

  const valyuAccessToken =
    (typeof body.valyuAccessToken === "string"
      ? body.valyuAccessToken
      : undefined) ||
    request.headers.get("x-valyu-access-token") ||
    undefined;

  try {
    const summaries: Record<string, string[]> = {};
    await pool(ids, CONCURRENCY, async (id) => {
      try {
        const status = await getDeepResearchStatus(id, { valyuAccessToken });
        // Deduped types, in the order the task reported them.
        const types: string[] = [];
        for (const d of status.deliverables ?? []) {
          if (!d.url || d.status === "failed") continue;
          if (!types.includes(d.type)) types.push(d.type);
        }
        summaries[id] = types;
      } catch (e) {
        // A single unreadable task shouldn't blank the whole row set — omit it
        // so the client can retry later, unless auth is gone for everyone.
        if (e instanceof ValyuError && e.status === 401) throw e;
      }
    });
    return NextResponse.json({ summaries });
  } catch (e) {
    if (e instanceof ValyuError) {
      if (e.status === 401)
        return NextResponse.json({ summaries: {}, authExpired: true });
      return NextResponse.json(
        { error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to load deliverable summaries",
      },
      { status: 500 },
    );
  }
}
