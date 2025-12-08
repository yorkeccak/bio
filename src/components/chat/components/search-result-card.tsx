"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VirtualizedContentDialog } from "@/components/virtualized-content-dialog";
import { Favicon } from "@/components/favicon";
import { MemoizedMarkdown } from "@/components/chat/markdown/memoized-markdown";
import {
  ExternalLink,
  FileText,
  Clipboard,
  BookOpen,
  Search,
} from "lucide-react";

const JsonView = dynamic(() => import("@uiw/react-json-view"), {
  ssr: false,
  loading: () => <div className="text-xs text-gray-500">Loading JSON…</div>,
});

// Search Result Card Component
export const SearchResultCard = ({
  result,
  type,
}: {
  result: any;
  type: "clinical" | "drug" | "literature" | "web";
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate content size to determine if we need virtualization
  const contentSize = useMemo(() => {
    const content =
      typeof result.fullContent === "string"
        ? result.fullContent
        : JSON.stringify(result.fullContent || {}, null, 2);
    return new Blob([content]).size;
  }, [result.fullContent]);

  // Use virtualized dialog for content larger than 500KB
  const useVirtualized = contentSize > 100 * 1024;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Ignore clipboard errors
    }
  };

  // If using virtualized dialog, render it separately
  if (useVirtualized) {
    const content =
      typeof result.fullContent === "string"
        ? result.fullContent
        : JSON.stringify(result.fullContent || {}, null, 2);

    return (
      <>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0 py-2"
          onClick={() => setIsDialogOpen(true)}
        >
          <CardContent className="h-full p-3">
            <div className="flex gap-2.5 h-full">
              {/* Favicon on left */}
              <div className="flex-shrink-0 pt-0.5">
                {type === "literature" ? (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                ) : type === "drug" ? (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <Search className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                ) : type === "clinical" ? (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <Favicon
                      url={result.url}
                      size={12}
                      className="w-3 h-3"
                    />
                  </div>
                )}
              </div>

              {/* Content on right */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Title and external link */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-gray-900 dark:text-gray-100">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>

                {/* Markdown preview with separator */}
                <div className="flex flex-col gap-1">
                  <div className="h-px bg-gray-200 dark:bg-gray-800" />
                  <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">
                    {result.summary?.slice(0, 120) || ''}
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      result.isStructured
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    }`}
                  >
                    {result.dataType}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-500 truncate">
                    {(() => {
                      try {
                        const url = new URL(result.url);
                        return url.hostname.replace("www.", "");
                      } catch {
                        return result.source || "unknown";
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <VirtualizedContentDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={result.title}
          content={content}
          isJson={result.isStructured}
        />
      </>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0 py-2">
          <CardContent className="h-full p-3">
            <div className="flex gap-2.5 h-full">
              {/* Favicon on left */}
              <div className="flex-shrink-0 pt-0.5">
                {type === "literature" ? (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                ) : type === "drug" ? (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <Search className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                ) : type === "clinical" ? (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    <Favicon
                      url={result.url}
                      size={12}
                      className="w-3 h-3"
                    />
                  </div>
                )}
              </div>

              {/* Content on right */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Title and external link */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-gray-900 dark:text-gray-100">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>

                {/* Markdown preview with separator */}
                <div className="flex flex-col gap-1">
                  <div className="h-px bg-gray-200 dark:bg-gray-800" />
                  <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">
                    {result.summary?.slice(0, 120) || ''}
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      result.isStructured
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    }`}
                  >
                    {result.dataType}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-500 truncate">
                    {(() => {
                      try {
                        const urlObj = new URL(result.url);
                        return urlObj.hostname.replace(/^www\./, "");
                      } catch {
                        return result.url;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="!max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className=" pr-8">{result.title}</DialogTitle>
          <Separator />
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {result.date && <span>• {result.date}</span>}
              {result.relevanceScore && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {(result.relevanceScore * 100).toFixed(0)}% relevance
                </span>
              )}
              {type === "literature" && result.doi && (
                <span className="text-xs bg-indigo-100 dark:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                  DOI: {result.doi}
                </span>
              )}
            </div>

            {type === "literature" && (result.authors || result.citation) && (
              <div className="space-y-1">
                {result.authors && result.authors.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Authors:</span> {result.authors.join(", ")}
                  </div>
                )}
                {result.citation && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 p-1 rounded">
                    {result.citation}
                  </div>
                )}
              </div>
            )}

            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                <Favicon
                  url={result.url}
                  size={16}
                  className="w-3.5 h-3.5"
                />
                <ExternalLink className="h-3 w-3" />
                View Source
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {result.isStructured ? (
            // Structured data - show as formatted JSON
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4" />
                  Structured Data
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    {result.dataType}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const jsonData =
                      typeof result.fullContent === "object"
                        ? JSON.stringify(result.fullContent, null, 2)
                        : result.fullContent;
                    copyToClipboard(jsonData);
                  }}
                  className="h-8 px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  Copy JSON
                </Button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <JsonView
                  value={(() => {
                    try {
                      return typeof result.fullContent === "object"
                        ? result.fullContent
                        : JSON.parse(result.fullContent || "{}");
                    } catch {
                      return {
                        error: "Invalid JSON data",
                        raw: result.fullContent,
                      };
                    }
                  })()}
                  displayDataTypes={false}
                  displayObjectSize={false}
                  enableClipboard={false}
                  collapsed={2}
                  style={
                    {
                      "--w-rjv-font-family":
                        'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      "--w-rjv-font-size": "13px",
                      "--w-rjv-line-height": "1.4",
                      "--w-rjv-color-string": "rgb(34, 197, 94)",
                      "--w-rjv-color-number": "rgb(239, 68, 68)",
                      "--w-rjv-color-boolean": "rgb(168, 85, 247)",
                      "--w-rjv-color-null": "rgb(107, 114, 128)",
                      "--w-rjv-color-undefined": "rgb(107, 114, 128)",
                      "--w-rjv-color-key": "rgb(30, 41, 59)",
                      "--w-rjv-background-color": "transparent",
                      "--w-rjv-border-left": "1px solid rgb(229, 231, 235)",
                      "--w-rjv-padding": "16px",
                      "--w-rjv-hover-color": "rgb(243, 244, 246)",
                    } as React.CSSProperties
                  }
                  className="dark:[--w-rjv-color-string:rgb(34,197,94)] dark:[--w-rjv-color-number:rgb(248,113,113)] dark:[--w-rjv-color-boolean:rgb(196,181,253)] dark:[--w-rjv-color-key:rgb(248,250,252)] dark:[--w-rjv-border-left:1px_solid_rgb(75,85,99)] dark:[--w-rjv-hover-color:rgb(55,65,81)]"
                />
              </div>
            </div>
          ) : (
            // Unstructured data - show as markdown
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4" />
                Content
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                  {result.dataType}
                </span>
                {result.length && (
                  <span className="text-xs text-gray-500">
                    {result.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MemoizedMarkdown
                  text={
                    typeof result.fullContent === "string"
                      ? result.fullContent
                      : typeof result.fullContent === "number"
                      ? `$${result.fullContent.toFixed(2)}`
                      : typeof result.fullContent === "object"
                      ? JSON.stringify(result.fullContent, null, 2)
                      : String(result.fullContent || "No content available")
                  }
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
