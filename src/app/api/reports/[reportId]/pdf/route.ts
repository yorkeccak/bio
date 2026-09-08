import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  getDeepResearchStatus,
  ValyuError,
  valyuErrorStatus,
} from "@/lib/valyu-workflows";

export const maxDuration = 300;

function isAllowedPdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith(".valyu.ai") ||
      host.endsWith(".storage.valyu.ai") ||
      host.endsWith(".amazonaws.com") ||
      host.endsWith(".s3.amazonaws.com")
    );
  } catch {
    return false;
  }
}

export async function POST(
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
  const valyuAccessToken =
    (typeof body.valyuAccessToken === "string"
      ? body.valyuAccessToken
      : undefined) ||
    request.headers.get("x-valyu-access-token") ||
    undefined;

  try {
    const status = await getDeepResearchStatus(reportId, { valyuAccessToken });

    if (status.status !== "completed") {
      return NextResponse.json(
        { error: "Report is still being generated." },
        { status: 409 },
      );
    }

    if (!status.pdfUrl || !isAllowedPdfUrl(status.pdfUrl)) {
      return NextResponse.json(
        { error: "PDF is not available for this report." },
        { status: 404 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let pdfRes: Response;
    try {
      pdfRes = await fetch(status.pdfUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (
      !pdfRes.ok ||
      pdfRes.headers.get("content-type")?.includes("text/html")
    ) {
      return NextResponse.json(
        { error: "Failed to fetch PDF from Valyu." },
        { status: 502 },
      );
    }

    const blob = await pdfRes.blob();
    const filename = (status.title || "report")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (e) {
    if (e instanceof ValyuError) {
      return NextResponse.json(
        { error: e.message },
        { status: valyuErrorStatus(e) },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PDF export failed" },
      { status: 500 },
    );
  }
}
