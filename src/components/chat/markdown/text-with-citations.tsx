"use client";

import { memo, useMemo } from "react";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { CitationMap } from "@/lib/citation-utils";
import { MemoizedMarkdown } from "@/components/chat/markdown/memoized-markdown";

// THIS IS THE KEY OPTIMIZATION - prevents re-renders during streaming
// Extract citations ONLY when parts change, NOT when text streams
export const MemoizedTextPartWithCitations = memo(
  function MemoizedTextPartWithCitations({
    text,
    messageParts,
    currentPartIndex,
    allMessages,
    currentMessageIndex,
  }: {
    text: string;
    messageParts: any[];
    currentPartIndex: number;
    allMessages?: any[];
    currentMessageIndex?: number;
  }) {
    // Extract citations only when parts before this one change, not when text streams
    const citations = useMemo(() => {
      const citationMap: CitationMap = {};
      let citationNumber = 1;

      // Scan ALL previous messages AND current message for tool results
      if (allMessages && currentMessageIndex !== undefined) {
        for (let msgIdx = 0; msgIdx <= currentMessageIndex; msgIdx++) {
          const msg = allMessages[msgIdx];
          if (!msg) continue; // Skip if message doesn't exist
          const parts = msg.parts || (Array.isArray(msg.content) ? msg.content : []);

          for (let i = 0; i < parts.length; i++) {
            const p = parts[i];

            // Check for search tool results - handle both live streaming and saved message formats
            // Live: p.type = "tool-clinicalTrialsSearch", Saved: p.type = "tool-result" with toolName
            const isSearchTool =
              p.type === "tool-clinicalTrialsSearch" ||
              p.type === "tool-drugInformationSearch" ||
              p.type === "tool-biomedicalLiteratureSearch" ||
              p.type === "tool-webSearch" ||
              (p.type === "tool-result" && (
                p.toolName === "clinicalTrialsSearch" ||
                p.toolName === "drugInformationSearch" ||
                p.toolName === "biomedicalLiteratureSearch" ||
                p.toolName === "webSearch"
              ));

            if (isSearchTool && (p.output || p.result)) {
              try {
                const output = typeof p.output === "string" ? JSON.parse(p.output) :
                              typeof p.result === "string" ? JSON.parse(p.result) :
                              p.output || p.result;

                // Check if this is a search result with multiple items
                if (output.results && Array.isArray(output.results)) {
                  output.results.forEach((item: any) => {
                    const key = `[${citationNumber}]`;
                    let description = item.content || item.summary || item.description || "";
                    if (typeof description === "object") {
                      description = JSON.stringify(description);
                    }
                    citationMap[key] = [
                      {
                        number: citationNumber.toString(),
                        title: item.title || `Source ${citationNumber}`,
                        url: item.url || "",
                        description: description,
                        source: item.source,
                        date: item.date,
                        authors: Array.isArray(item.authors) ? item.authors : [],
                        doi: item.doi,
                        relevanceScore: item.relevanceScore || item.relevance_score,
                        toolType:
                          p.type === "tool-clinicalTrialsSearch" || p.toolName === "clinicalTrialsSearch"
                            ? "clinical"
                            : p.type === "tool-drugInformationSearch" || p.toolName === "drugInformationSearch"
                            ? "drug"
                            : p.type === "tool-biomedicalLiteratureSearch" || p.toolName === "biomedicalLiteratureSearch"
                            ? "literature"
                            : "web",
                      },
                    ];
                    citationNumber++;
                  });
                }
              } catch (error) {
                // Ignore parse errors
              }
            }
          }
        }
      } else {
        // Fallback: scan current message only (for streaming messages)
        for (let i = 0; i < messageParts.length; i++) {
          const p = messageParts[i];

          const isSearchTool =
            p.type === "tool-clinicalTrialsSearch" ||
            p.type === "tool-drugInformationSearch" ||
            p.type === "tool-biomedicalLiteratureSearch" ||
            p.type === "tool-webSearch" ||
            (p.type === "tool-result" && (
              p.toolName === "clinicalTrialsSearch" ||
              p.toolName === "drugInformationSearch" ||
              p.toolName === "biomedicalLiteratureSearch" ||
              p.toolName === "webSearch"
            ));

          if (isSearchTool && (p.output || p.result)) {
            try {
              const output = typeof p.output === "string" ? JSON.parse(p.output) :
                            typeof p.result === "string" ? JSON.parse(p.result) :
                            p.output || p.result;

              if (output.results && Array.isArray(output.results)) {
                output.results.forEach((item: any) => {
                  const key = `[${citationNumber}]`;
                  let description = item.content || item.summary || item.description || "";
                  if (typeof description === "object") {
                    description = JSON.stringify(description);
                  }
                  citationMap[key] = [
                    {
                      number: citationNumber.toString(),
                      title: item.title || `Source ${citationNumber}`,
                      url: item.url || "",
                      description: description,
                      source: item.source,
                      date: item.date,
                      authors: Array.isArray(item.authors) ? item.authors : [],
                      doi: item.doi,
                      relevanceScore: item.relevanceScore || item.relevance_score,
                      toolType:
                        p.type === "tool-clinicalTrialsSearch" || p.toolName === "clinicalTrialsSearch"
                          ? "clinical"
                          : p.type === "tool-drugInformationSearch" || p.toolName === "drugInformationSearch"
                          ? "drug"
                          : p.type === "tool-biomedicalLiteratureSearch" || p.toolName === "biomedicalLiteratureSearch"
                          ? "literature"
                          : "web",
                    },
                  ];
                  citationNumber++;
                });
              }
            } catch (error) {
              // Ignore parse errors
            }
          }
        }
      }

      return citationMap;
    }, [messageParts, currentPartIndex, allMessages, currentMessageIndex]); // Only recompute when parts array changes, not text

    // Memoize whether citations exist to avoid Object.keys() on every render
    const hasCitations = useMemo(() => {
      return Object.keys(citations).length > 0;
    }, [citations]);

    // Render with or without citations
    if (hasCitations) {
      return <CitationTextRenderer text={text} citations={citations} />;
    } else {
      return <MemoizedMarkdown text={text} />;
    }
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if text changed OR parts structure changed
    // This prevents re-rendering on every token during streaming
    return (
      prevProps.text === nextProps.text &&
      prevProps.currentPartIndex === nextProps.currentPartIndex &&
      prevProps.messageParts.length === nextProps.messageParts.length
    );
  }
);
