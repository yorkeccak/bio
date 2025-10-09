import { NextRequest, NextResponse } from "next/server";

// Note: This endpoint now provides info about in-memory caching
// The cache is stored in memory and managed by the main news route
// Each serverless instance has its own cache that expires after 1 hour

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message:
      "Cache management has been updated to use in-memory storage. " +
      "To refresh the cache, use /api/news?refresh=true instead. " +
      "Each serverless instance manages its own cache automatically.",
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    info: "News API now uses in-memory caching for Vercel serverless deployment",
    details: {
      cacheType: "In-memory (module-level)",
      expiration: "1 hour",
      persistence: "During warm starts only (each instance has its own cache)",
      refresh: "Use /api/news?refresh=true to bypass cache",
      fallback: "Stale cache served if fresh fetch fails",
    },
    note:
      "Cache status varies per serverless instance and cannot be centrally queried",
  });
}
