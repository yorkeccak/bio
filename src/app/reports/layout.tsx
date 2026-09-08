import { redirect } from "next/navigation";
import * as db from "@/lib/db";

/**
 * Reports are per-user, so everything under /reports requires a session.
 * In self-hosted mode `db.getUser()` returns the local dev user, so the gate
 * only bites in the hosted Valyu mode. The matching API routes enforce this
 * independently — this layout just keeps signed-out visitors off the page.
 */
export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    ({
      data: { user },
    } = await db.getUser());
  } catch {
    // Treat an unreachable auth backend as signed out.
  }

  if (!user) redirect("/?auth=required");

  return <>{children}</>;
}
