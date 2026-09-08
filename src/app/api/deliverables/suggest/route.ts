import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { suggestDeliverables } from "@/lib/deliverable-suggest";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let query = "";
  try {
    const body = await request.json();
    query = typeof body.query === "string" ? body.query : "";
  } catch {
    // malformed body -> empty suggestions
  }

  try {
    const suggestions = await suggestDeliverables(query);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
