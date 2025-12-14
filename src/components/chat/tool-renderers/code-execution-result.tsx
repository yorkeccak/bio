"use client";

import { memo } from "react";
import { Check, X, Clock, RefreshCw, AlertTriangle } from "lucide-react";

// Output types from the notebook cell execution
interface CellOutput {
  type: 'stdout' | 'stderr' | 'text' | 'image' | 'html' | 'svg';
  text?: string;
  data?: string;
  format?: string;
}

interface NotebookCellResult {
  cellId?: string;
  cellIndex?: number;
  executionOrder?: number;
  code: string;
  outputs?: CellOutput[];
  executionTimeMs?: number;
  success?: boolean;
  error?: {
    name?: string;
    message?: string;
    traceback?: string[];
  };
  retryCount?: number;
  description?: string;
  isNewSession?: boolean;
}

// Memoized Code Execution Result - handles both old string format and new notebook cell format
export const MemoizedCodeExecutionResult = memo(function MemoizedCodeExecutionResult({
  code,
  output,
  actionId,
  expandedTools,
  toggleToolExpansion,
  // New props for notebook cell metadata
  cellIndex,
  executionOrder,
  success,
  error,
  retryCount,
  executionTimeMs,
  outputs,
  isNewSession,
}: {
  code: string;
  output?: string | NotebookCellResult;
  actionId: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
  cellIndex?: number;
  executionOrder?: number;
  success?: boolean;
  error?: { name?: string; message?: string; traceback?: string[] };
  retryCount?: number;
  executionTimeMs?: number;
  outputs?: CellOutput[];
  isNewSession?: boolean;
}) {
  // Determine if we have the new notebook format or old string format
  const isNotebookFormat = outputs !== undefined || success !== undefined;

  // Format execution time
  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  // Escape HTML entities to prevent rendering <module> and other HTML-like content as actual HTML
  const escapeHtml = (text: string) => {
    if (typeof document === 'undefined') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Get text output from outputs array
  const getTextOutput = () => {
    if (!outputs) return '';
    const textOutputs: string[] = [];
    for (const out of outputs) {
      if ((out.type === 'stdout' || out.type === 'stderr' || out.type === 'text') && out.text) {
        textOutputs.push(out.text);
      }
    }
    return textOutputs.join('\n');
  };

  // Get images from outputs
  const getImages = () => {
    if (!outputs) return [];
    const images: { format: string; data: string }[] = [];
    for (const out of outputs) {
      if (out.type === 'image' && out.data) {
        images.push({ format: out.format || 'png', data: out.data });
      }
    }
    return images;
  };

  // Get HTML output
  const getHtmlOutput = () => {
    if (!outputs) return null;
    for (const out of outputs) {
      if (out.type === 'html' && out.data) {
        return out.data;
      }
    }
    return null;
  };

  const textOutput = isNotebookFormat ? getTextOutput() : (typeof output === 'string' ? output : '');
  const images = isNotebookFormat ? getImages() : [];
  const htmlOutput = isNotebookFormat ? getHtmlOutput() : null;

  return (
    <div className="space-y-4">
      {/* Cell metadata header (only for notebook format) */}
      {isNotebookFormat && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              Cell [{executionOrder !== undefined ? executionOrder : cellIndex !== undefined ? cellIndex + 1 : '*'}]
            </span>
            {success !== undefined && (
              success ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <X className="h-3.5 w-3.5 text-red-500" />
              )
            )}
            {retryCount !== undefined && retryCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500" title={`Retried ${retryCount} time(s)`}>
                <RefreshCw className="h-3 w-3" />
                {retryCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {executionTimeMs !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatExecutionTime(executionTimeMs)}
              </span>
            )}
            {isNewSession && (
              <span className="text-blue-500">(new session)</span>
            )}
          </div>
        </div>
      )}

      {/* Code Section - clean monospace display */}
      <div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          Input
        </div>
        <pre className="p-4 bg-gray-900 dark:bg-black/40 text-gray-100 text-xs overflow-x-auto rounded-lg max-h-[400px] overflow-y-auto border border-gray-800 dark:border-gray-800/50 shadow-inner font-mono">
          <code>{code || "No code available"}</code>
        </pre>
      </div>

      {/* Output Section */}
      <div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          Output
        </div>
        <div className="space-y-3">
          {/* Text output */}
          {textOutput && (
            <pre className="p-4 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 text-sm overflow-x-auto rounded-lg max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700/50 font-mono whitespace-pre-wrap">
              {escapeHtml(textOutput)}
            </pre>
          )}

          {/* HTML output */}
          {htmlOutput && (
            <div
              className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: htmlOutput }}
            />
          )}

          {/* Image outputs */}
          {images.map((img, i) => (
            <div key={i} className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3">
              <img
                src={`data:image/${img.format};base64,${img.data}`}
                alt={`Output ${i + 1}`}
                className="max-w-full h-auto rounded"
              />
            </div>
          ))}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                  {error.name || 'Error'}
                </span>
              </div>
              <pre className="text-sm text-red-700 dark:text-red-300 overflow-x-auto font-mono whitespace-pre-wrap">
                {error.message}
              </pre>
              {error.traceback && error.traceback.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-red-500 cursor-pointer hover:underline">
                    Show traceback
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-x-auto font-mono whitespace-pre-wrap">
                    {error.traceback.join('\n')}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* No output message */}
          {!textOutput && !htmlOutput && images.length === 0 && !error && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700/50 text-sm text-muted-foreground">
              (No output produced)
            </div>
          )}
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
    prevProps.expandedTools === nextProps.expandedTools &&
    prevProps.cellIndex === nextProps.cellIndex &&
    prevProps.success === nextProps.success &&
    prevProps.retryCount === nextProps.retryCount &&
    prevProps.executionTimeMs === nextProps.executionTimeMs &&
    prevProps.outputs === nextProps.outputs
  );
});
MemoizedCodeExecutionResult.displayName = 'MemoizedCodeExecutionResult';
