"use client";

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, RefreshCw, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

interface NotebookCellProps {
  cell: {
    id: string;
    cellIndex: number;
    cellType: 'code' | 'markdown';
    source: string;
    outputs: any[];
    executionCount: number | null;
    success: boolean;
    errorMessage?: string;
    executionTimeMs?: number;
    retryCount?: number;
  };
  index: number;
}

export const NotebookCell = memo(function NotebookCell({ cell, index }: NotebookCellProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  // Get text output from outputs array
  const getTextOutput = () => {
    const textOutputs: string[] = [];
    for (const output of cell.outputs || []) {
      if (output.type === 'stdout' && output.text) {
        textOutputs.push(output.text);
      } else if (output.type === 'stderr' && output.text) {
        textOutputs.push(output.text);
      } else if (output.type === 'text' && output.text) {
        textOutputs.push(output.text);
      }
    }
    return textOutputs.join('\n');
  };

  // Get images from outputs
  const getImages = () => {
    const images: { format: string; data: string }[] = [];
    for (const output of cell.outputs || []) {
      if (output.type === 'image' && output.data) {
        images.push({ format: output.format || 'png', data: output.data });
      }
    }
    return images;
  };

  // Get HTML output
  const getHtmlOutput = () => {
    for (const output of cell.outputs || []) {
      if (output.type === 'html' && output.data) {
        return output.data;
      }
    }
    return null;
  };

  const textOutput = getTextOutput();
  const images = getImages();
  const htmlOutput = getHtmlOutput();
  const hasOutput = textOutput || images.length > 0 || htmlOutput || cell.errorMessage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.03 }}
      className={`border rounded-lg overflow-hidden ${
        cell.success
          ? 'border-gray-200 dark:border-gray-700'
          : 'border-red-300 dark:border-red-700'
      }`}
    >
      {/* Cell Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
          cell.success
            ? 'bg-gray-50 dark:bg-gray-800/50'
            : 'bg-red-50 dark:bg-red-900/20'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-mono text-muted-foreground bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            [{cell.executionCount !== null ? cell.executionCount : '*'}]
          </span>
          {cell.success ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <X className="h-3.5 w-3.5 text-red-500" />
          )}
          {cell.retryCount && cell.retryCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-500" title={`Retried ${cell.retryCount} time(s)`}>
              <RefreshCw className="h-3 w-3" />
              {cell.retryCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cell.executionTimeMs && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatExecutionTime(cell.executionTimeMs)}
            </span>
          )}
        </div>
      </div>

      {/* Cell Content */}
      {isExpanded && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Input */}
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              In [{cell.executionCount !== null ? cell.executionCount : ' '}]
            </div>
            <pre className="p-3 bg-gray-900 dark:bg-black/40 text-gray-100 text-xs overflow-x-auto rounded max-h-[250px] overflow-y-auto font-mono">
              <code>{cell.source}</code>
            </pre>
          </div>

          {/* Output */}
          {hasOutput && (
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Out [{cell.executionCount !== null ? cell.executionCount : ' '}]
              </div>
              <div className="space-y-3">
                {/* Text output */}
                {textOutput && (
                  <pre className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-xs overflow-x-auto max-h-[250px] overflow-y-auto font-mono text-gray-800 dark:text-gray-200">
                    {textOutput}
                  </pre>
                )}

                {/* HTML output */}
                {htmlOutput && (
                  <div
                    className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: htmlOutput }}
                  />
                )}

                {/* Image outputs */}
                {images.map((img, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
                    <img
                      src={`data:image/${img.format};base64,${img.data}`}
                      alt={`Output ${i + 1}`}
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                ))}

                {/* Error message */}
                {cell.errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                        Error
                      </span>
                    </div>
                    <pre className="text-xs text-red-700 dark:text-red-300 overflow-x-auto font-mono whitespace-pre-wrap">
                      {cell.errorMessage}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});
