// Citation extraction and management utilities

export interface Citation {
  number: string;
  title: string;
  url: string;
  description?: string;
  quote?: string;
  source?: string;
  date?: string;
  authors?: string[];
  doi?: string;
  relevanceScore?: number;
  toolType?: "clinical" | "drug" | "literature" | "web";
}

export interface CitationMap {
  [key: string]: Citation[];
}

// Extract citations from tool results and maintain citation numbers
export function extractCitationsFromToolResults(
  toolResults: any[],
): CitationMap {
  const citations: CitationMap = {};
  let citationNumber = 1;

  toolResults.forEach((result) => {
    if (!result || !result.output) return;

    try {
      const output =
        typeof result.output === "string"
          ? JSON.parse(result.output)
          : result.output;

      // Handle search results with multiple items
      if (output.results && Array.isArray(output.results)) {
        output.results.forEach((item: any) => {
          const citation: Citation = {
            number: citationNumber.toString(),
            title: item.title || `Source ${citationNumber}`,
            url: item.url || "",
            description: item.content || item.summary || item.description,
            source: item.source,
            date: item.date,
            relevanceScore: item.relevanceScore || item.relevance_score,
            toolType: getToolType(result.toolName),
          };

          // Add academic-specific fields
          if (item.authors) {
            citation.authors = Array.isArray(item.authors)
              ? item.authors
              : [item.authors];
          }
          if (item.doi) {
            citation.doi = item.doi;
          }
          if (item.citation) {
            citation.quote = item.citation;
          }

          const key = `[${citationNumber}]`;
          citations[key] = [citation];
          citationNumber++;
        });
      }
    } catch (error) {}
  });

  return citations;
}

/** Map DeepResearch citation markers using the source_id returned upstream. */
export function buildCitationMapFromSources(
  sources: unknown[] | null | undefined,
): CitationMap {
  const map: CitationMap = {};
  if (!Array.isArray(sources)) return map;

  sources.forEach((raw, index) => {
    const source = raw as Record<string, any> | null;
    if (!source) return;
    const id = String(source.source_id ?? index + 1);
    const url = typeof source.url === "string" ? source.url : "";
    (map[`[${id}]`] ||= []).push({
      number: id,
      title: source.title || url || `Source ${id}`,
      url,
      description:
        source.description || source.content || source.snippet || undefined,
      date: source.date || undefined,
      toolType: "literature",
    });
  });
  return map;
}

/** Convert inline `[[n]](url)` citations to ordinary markers plus card data. */
export function extractMarkdownLinkCitations(text: string): {
  citations: CitationMap;
  text: string;
} {
  const citations: CitationMap = {};
  const rewritten = text.replace(
    /\[\[(\d+)\]\]\(\s*((?:[^()\s]|\([^()\s]*\))+)\s*\)/g,
    (_match, number: string, url: string) => {
      const key = `[${number}]`;
      let title = url;
      try {
        title = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        // Keep the URL as the display title when it is not parseable.
      }
      const list = (citations[key] ||= []);
      if (!list.some((citation) => citation.url === url)) {
        list.push({ number, title, url, toolType: "web" });
      }
      return key;
    },
  );
  return { citations, text: rewritten };
}

// Get tool type from tool name
function getToolType(
  toolName?: string,
): "clinical" | "drug" | "literature" | "web" | undefined {
  if (!toolName) return undefined;

  if (toolName.toLowerCase().includes("clinical")) return "clinical";
  if (toolName.toLowerCase().includes("drug")) return "drug";
  if (
    toolName.toLowerCase().includes("literature") ||
    toolName.toLowerCase().includes("biomedical")
  )
    return "literature";
  if (toolName.toLowerCase().includes("web")) return "web";

  return undefined;
}

// Parse text and identify citation markers
export function parseCitations(text: string): {
  segments: Array<{ type: "text" | "citation"; content: string }>;
} {
  const citationPattern = /\[(\d+)\]/g;
  const segments: Array<{ type: "text" | "citation"; content: string }> = [];
  let lastIndex = 0;

  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add citation
    segments.push({
      type: "citation",
      content: match[0], // Full citation like [1]
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return { segments };
}

// Collect all citations from a message's tool calls
export function collectMessageCitations(message: any): CitationMap {
  const citations: CitationMap = {};

  if (!message.parts) return citations;

  message.parts.forEach((part: any) => {
    if (part.type === "tool-result" && part.result) {
      const toolCitations = extractCitationsFromToolResults([
        {
          toolName: part.toolName,
          output: part.result,
        },
      ]);

      Object.assign(citations, toolCitations);
    }
  });

  return citations;
}

// Merge citations from multiple messages
export function mergeCitations(...citationMaps: CitationMap[]): CitationMap {
  const merged: CitationMap = {};

  citationMaps.forEach((map) => {
    Object.entries(map).forEach(([key, citations]) => {
      if (!merged[key]) {
        merged[key] = [];
      }
      merged[key].push(...citations);
    });
  });

  return merged;
}
