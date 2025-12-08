"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { markdownComponents } from "@/components/chat/markdown/markdown-components";
import { parseSpecialReferences } from "@/components/chat/utils/parse-special-references";
import { CsvRenderer } from "@/components/csv-renderer";
import { ChartImageRenderer } from "@/components/chat/tool-renderers/chart-result";
import {
  preprocessMarkdownText,
  cleanBiomedicalText,
} from "@/lib/markdown-utils";

// Memoized Markdown renderer to avoid re-parsing on unrelated state updates
export const MemoizedMarkdown = memo(function MemoizedMarkdown({
  text,
}: {
  text: string;
}) {
  const enableRawHtml = (text?.length || 0) < 20000;

  // Parse special references (CSV/charts) - MUST be before any conditional returns
  const specialSegments = useMemo(() => parseSpecialReferences(text), [text]);
  const hasSpecialRefs = specialSegments.some(s => s.type === 'csv' || s.type === 'chart');

  // Process text for regular markdown - MUST be before any conditional returns
  const processed = useMemo(
    () => {
      const result = preprocessMarkdownText(cleanBiomedicalText(text || ""));
      return result;
    },
    [text]
  );

  // If we have CSV or chart references, render them separately to avoid nesting issues
  if (hasSpecialRefs) {
    return (
      <>
        {specialSegments.map((segment, idx) => {
          if (segment.type === 'csv' && segment.id) {
            return <CsvRenderer key={`${segment.id}-${idx}`} csvId={segment.id} />;
          }
          if (segment.type === 'chart' && segment.id) {
            return <ChartImageRenderer key={`${segment.id}-${idx}`} chartId={segment.id} />;
          }
          // Render text segment as markdown
          const segmentProcessed = preprocessMarkdownText(cleanBiomedicalText(segment.content));
          return (
            <ReactMarkdown
              key={idx}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents as any}
              rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
              skipHtml={!enableRawHtml}
              unwrapDisallowed={true}
            >
              {segmentProcessed}
            </ReactMarkdown>
          );
        })}
      </>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents as any}
      rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
      skipHtml={!enableRawHtml}
      unwrapDisallowed={true}
    >
      {processed}
    </ReactMarkdown>
  );
}, (prevProps, nextProps) => {
  // PERFORMANCE FIX: Only re-render if text actually changes
  return prevProps.text === nextProps.text;
});
