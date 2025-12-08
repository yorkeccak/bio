// Helper function to extract search results for carousel display
export const extractSearchResults = (jsonOutput: string) => {
  try {
    const data = JSON.parse(jsonOutput);
    if (data.results && Array.isArray(data.results)) {
      const mappedResults = data.results.map((result: any, index: number) => ({
        id: index,
        title: result.title || `Result ${index + 1}`,
        summary: result.content
          ? typeof result.content === "string"
            ? result.content.length > 150
              ? result.content.substring(0, 150) + "..."
              : result.content
            : typeof result.content === "number"
            ? `Current Price: $${result.content.toFixed(2)}`
            : `${
                result.dataType === "structured" ? "Structured data" : "Data"
              } from ${result.source || "source"}`
          : "No summary available",
        source: result.source || "Unknown source",
        date: result.date || "",
        url: result.url || "",
        fullContent:
          typeof result.content === "number"
            ? `$${result.content.toFixed(2)}`
            : result.content || "No content available",
        isStructured: result.dataType === "structured",
        dataType: result.dataType || "unstructured",
        length: result.length,
        imageUrls: result.imageUrl || result.image_url || {},
        relevanceScore: result.relevanceScore || result.relevance_score || 0,
      }));

      // Sort results: structured first, then by relevance score within each category
      return mappedResults.sort((a: any, b: any) => {
        // If one is structured and the other is unstructured, structured comes first
        if (a.isStructured && !b.isStructured) return -1;
        if (!a.isStructured && b.isStructured) return 1;

        // Within the same category, sort by relevance score (higher score first)
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      });
    }
    return [];
  } catch (error) {
    return [];
  }
};
