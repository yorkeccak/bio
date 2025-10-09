import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

// Module-level in-memory cache (persists during warm starts)
let memoryCache: {
  newsItems: any[];
  timestamp: number;
} | null = null;

// Fetch news data from Valyu API
async function fetchNewsData() {
  const valyuApiKey = process.env.VALYU_API_KEY;

  if (!valyuApiKey) {
    throw new Error("Valyu API key not configured");
  }

  const valyu = new Valyu(valyuApiKey, "https://api.valyu.network/v1");

  // Search for biomedical and healthcare news
  const newsQueries = [
    "biomedical research news today",
    "clinical trials news today",
    "pharmaceutical news today",
    "medical breakthroughs today",
    "healthcare innovation news",
    "biotech news today",
    "drug development news",
    "medical research news",
    "healthcare technology news",
    "precision medicine news",
  ];

  console.log("Running biomedical news queries...");

  // Try multiple queries to get diverse news content
  let allResults: any[] = [];
  for (const query of newsQueries) {
    try {
      console.log(`Searching for: ${query}`);
      const response = await valyu.search(query);
      console.log(
        `Response for "${query}":`,
        response?.results?.length || 0,
        "results"
      );
      if (response?.results && response.results.length > 0) {
        allResults = [...allResults, ...response.results];
        console.log(
          `Added ${response.results.length} results, total: ${allResults.length}`
        );
      }
    } catch (queryError) {
      console.error(`Error with query "${query}":`, queryError);
      // Continue with other queries
    }
  }

  console.log(`Total results collected: ${allResults.length}`);

  if (allResults.length > 0) {
    // Map results and remove duplicates
    const newsItems = allResults
      .map((item: any) => ({
        title: item.title || "News Article",
        url: item.url,
        image_url: item.image_url || null,
        content: item.content || "",
        source: item.metadata?.source || "News Source",
        date: item.metadata?.date || new Date().toISOString(),
      }))
      // Remove duplicates based on URL
      .filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.url === item.url)
      )
      // Remove duplicates based on title
      .filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.title === item.title)
      )
      // Filter for biomedical and healthcare relevance
      .filter(
        (item) =>
          // Include biomedical/healthcare keywords in title or content
          item.title.toLowerCase().includes("medical") ||
          item.title.toLowerCase().includes("health") ||
          item.title.toLowerCase().includes("biomedical") ||
          item.title.toLowerCase().includes("clinical") ||
          item.title.toLowerCase().includes("pharmaceutical") ||
          item.title.toLowerCase().includes("biotech") ||
          item.title.toLowerCase().includes("drug") ||
          item.title.toLowerCase().includes("therapy") ||
          item.title.toLowerCase().includes("treatment") ||
          item.title.toLowerCase().includes("research") ||
          item.title.toLowerCase().includes("trial") ||
          item.title.toLowerCase().includes("medicine") ||
          item.title.toLowerCase().includes("cancer") ||
          item.title.toLowerCase().includes("disease") ||
          item.title.toLowerCase().includes("vaccine") ||
          item.title.toLowerCase().includes("genetic") ||
          item.title.toLowerCase().includes("protein") ||
          item.title.toLowerCase().includes("cell") ||
          item.title.toLowerCase().includes("molecular") ||
          item.title.toLowerCase().includes("diagnostic") ||
          item.title.toLowerCase().includes("therapeutic") ||
          item.content.toLowerCase().includes("medical") ||
          item.content.toLowerCase().includes("health") ||
          item.content.toLowerCase().includes("biomedical") ||
          item.content.toLowerCase().includes("clinical") ||
          item.content.toLowerCase().includes("pharmaceutical") ||
          item.content.toLowerCase().includes("biotech") ||
          item.content.toLowerCase().includes("drug") ||
          item.content.toLowerCase().includes("therapy") ||
          item.content.toLowerCase().includes("treatment") ||
          item.content.toLowerCase().includes("research") ||
          item.content.toLowerCase().includes("trial") ||
          item.content.toLowerCase().includes("medicine")
      )
      // Limit to 30 articles for performance
      .slice(0, 30);

    console.log(`Final news items: ${newsItems.length}`);

    return newsItems;
  } else {
    console.log("No results found from any query");
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    // Check memory cache first (if not forced refresh)
    if (memoryCache && !refresh) {
      const cacheAge = Date.now() - memoryCache.timestamp;
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

      if (cacheAge < oneHour) {
        console.log("[News API] Serving from memory cache");
        return NextResponse.json({
          newsItems: memoryCache.newsItems,
          total: memoryCache.newsItems.length,
          cached: true,
        });
      }
    }

    // Fetch fresh data
    try {
      console.log("[News API] Fetching fresh news data");
      const newsItems = await fetchNewsData();

      // Update memory cache
      memoryCache = {
        newsItems,
        timestamp: Date.now(),
      };

      return NextResponse.json({
        newsItems,
        total: newsItems.length,
        cached: false,
      });
    } catch (error) {
      console.error("[News API] Error fetching news:", error);

      // Fallback to stale cache if available
      if (memoryCache) {
        console.log("[News API] Falling back to stale cache");
        return NextResponse.json({
          newsItems: memoryCache.newsItems,
          total: memoryCache.newsItems.length,
          cached: true,
          stale: true,
        });
      }

      return NextResponse.json(
        { error: "Failed to fetch news" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[News API] Error in news endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
