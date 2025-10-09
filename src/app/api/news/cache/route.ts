import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "news-cache.json");

export async function DELETE(request: NextRequest) {
  try {
    // Delete the cache file
    await fs.unlink(CACHE_FILE);
    console.log("News cache cleared");
    return NextResponse.json({
      success: true,
      message: "News cache cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { success: false, message: "Cache file not found or already cleared" },
      { status: 404 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get cache status
    const cacheData = await fs.readFile(CACHE_FILE, "utf-8");
    const cached = JSON.parse(cacheData);

    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const isWithinHour = now - cached.timestamp < oneHour;

    const cacheAge = now - cached.timestamp;
    const cacheAgeHours = Math.floor(cacheAge / (1000 * 60 * 60));
    const cacheAgeMinutes = Math.floor(
      (cacheAge % (1000 * 60 * 60)) / (1000 * 60)
    );

    return NextResponse.json({
      cached: isWithinHour,
      cacheDate: cached.date,
      isWithinHour,
      cacheAge: `${cacheAgeHours}h ${cacheAgeMinutes}m`,
      newsCount: cached.newsItems.length,
      timestamp: cached.timestamp,
      willRefresh: !isWithinHour
        ? "Cache will refresh on next request (older than 1 hour)"
        : "Cache is valid (less than 1 hour old)",
    });
  } catch (error) {
    return NextResponse.json({
      cached: false,
      message: "No cache found",
    });
  }
}
