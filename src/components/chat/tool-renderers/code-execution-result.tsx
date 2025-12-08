"use client";

import { memo } from "react";
import { MemoizedMarkdown } from "@/components/chat/markdown/memoized-markdown";

// Memoized Code Execution Result - prevents re-rendering when props don't change
// Uses plain pre/code WITHOUT syntax highlighting to prevent browser freeze
export const MemoizedCodeExecutionResult = memo(function MemoizedCodeExecutionResult({
  code,
  output,
  actionId,
  expandedTools,
  toggleToolExpansion
}: {
  code: string;
  output: string;
  actionId: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) {
  const isExpanded = expandedTools.has(actionId);

  // Escape HTML entities to prevent rendering <module> and other HTML-like content as actual HTML
  const escapeHtml = (text: string) => {
    if (typeof document === 'undefined') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="space-y-4">
      {/* Code Section - clean monospace display */}
      <div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Input</div>
        <pre className="p-4 bg-gray-900 dark:bg-black/40 text-gray-100 text-xs overflow-x-auto rounded-lg max-h-[400px] overflow-y-auto border border-gray-800 dark:border-gray-800/50 shadow-inner">
          <code>{code || "No code available"}</code>
        </pre>
      </div>

      {/* Output Section - elegant typography */}
      <div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Output</div>
        <div className="prose prose-sm max-w-none dark:prose-invert text-sm p-4 bg-white dark:bg-gray-800/50 rounded-lg max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700/50">
          <MemoizedMarkdown text={escapeHtml(output)} />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.code === nextProps.code &&
    prevProps.output === nextProps.output &&
    prevProps.actionId === nextProps.actionId &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
MemoizedCodeExecutionResult.displayName = 'MemoizedCodeExecutionResult';
