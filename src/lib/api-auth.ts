import { NextResponse } from "next/server";
import * as db from "@/lib/db";

/**
 * Resolves the current user for an API route.
 *
 * Returns the authenticated user, or a ready-to-return 401 response when there
 * is no session. In self-hosted mode `db.getUser()` yields the local dev user,
 * so these routes stay open there.
 *
 * @example
 * const auth = await requireUser(request);
 * if (!auth.user) return auth.response;
 */
export async function requireUser(
  request: Request,
): Promise<
  | { user: { id: string; email?: string | null }; response: null }
  | { user: null; response: NextResponse }
> {
  try {
    const {
      data: { user },
    } = await db.getUserFromRequest(request);

    if (user) {
      return {
        user: user as { id: string; email?: string | null },
        response: null,
      };
    }
  } catch {
    // Fall through to the unauthorized response below.
  }

  return {
    user: null,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
