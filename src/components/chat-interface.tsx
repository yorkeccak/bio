"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { HealthcareUIMessage } from "@/lib/types";
import pdf from "pdf-parse";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOllama } from "@/lib/ollama-context";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { AuthModal } from "@/components/auth/auth-modal";
import { createClient } from "@/utils/supabase/client";
import { track } from "@vercel/analytics";
import { OllamaStatusIndicator } from "@/components/ollama-status-indicator";
import { useSavedResults } from "@/lib/saved-result-context";
import type { SavedItem } from "@/lib/saved-result-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VirtualizedContentDialog } from "@/components/virtualized-content-dialog";
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Square,
  AlertCircle,
  Trash2,
  Loader2,
  Edit3,
  Wrench,
  Check,
  CheckCircle,
  Copy,
  Clock,
  Book,
  BookDashed,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Clipboard,
  X,
  Library,
  Plus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import katex from "katex";
import { FinancialChart } from "@/components/financial-chart";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { CitationMap } from "@/lib/citation-utils";
import ClinicalTrialsView from "@/components/ClinicalTrialsView";
const JsonView = dynamic(() => import("@uiw/react-json-view"), {
  ssr: false,
  loading: () => <div className="text-xs text-gray-500">Loading JSON…</div>,
});
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import {
  preprocessMarkdownText,
  cleanFinancialText,
} from "@/lib/markdown-utils";
import { motion, AnimatePresence } from "framer-motion";
import DataSourceLogos from "./data-source-logos";
import SocialLinks from "./social-links";
import {
  SeenResultsProvider,
  useSeenResults,
} from "@/lib/seen-results-context";
import { SavedResultsProvider } from "@/lib/saved-result-context";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Debug toggles removed per request

// Separate component for reasoning to avoid hook violations
const ReasoningComponent = ({
  part,
  messageId,
  index,
  status,
  expandedTools,
  toggleToolExpansion,
}: {
  part: any;
  messageId: string;
  index: number;
  status: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) => {
  const reasoningId = `reasoning-${messageId}-${index}`;
  // Check if explicitly collapsed (default is expanded for streaming)
  const isCollapsed = expandedTools.has(`collapsed-${reasoningId}`);
  const reasoningText = part.text || "";
  const previewLength = 150;
  const shouldShowToggle =
    reasoningText.length > previewLength || status === "streaming";
  const displayText = !isCollapsed
    ? reasoningText
    : reasoningText.slice(0, previewLength);

  const copyReasoningTrace = () => {
    navigator.clipboard.writeText(reasoningText);
  };

  const toggleCollapse = () => {
    const collapsedKey = `collapsed-${reasoningId}`;
    toggleToolExpansion(collapsedKey);
  };

  // Auto-scroll effect for streaming reasoning
  const reasoningRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (status === "streaming" && reasoningRef.current && !isCollapsed) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [reasoningText, status, isCollapsed]);

  return (
    <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="p-2.5 sm:p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <span className="text-lg">🧠</span>
            <span className="font-medium text-sm">AI Reasoning Process</span>
            {status === "streaming" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {reasoningText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyReasoningTrace}
                className="h-6 px-2 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
            {shouldShowToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="h-6 px-2 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div
          className={`${
            !isCollapsed
              ? "max-h-96 overflow-y-auto"
              : "max-h-20 overflow-hidden"
          } transition-all duration-200 scroll-smooth`}
        >
          <pre
            ref={reasoningRef}
            className="text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap font-mono leading-relaxed bg-purple-25 dark:bg-purple-950/30 p-2 rounded border"
            style={{ scrollBehavior: "smooth" }}
          >
            {displayText}
            {isCollapsed && shouldShowToggle && (
              <span className="text-purple-500 dark:text-purple-400">...</span>
            )}
          </pre>
        </div>

        {status === "streaming" && (
          <div className="mt-2 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
            <div className="flex items-center gap-2 italic">
              <Clock className="h-3 w-3" />
              Reasoning in progress...
            </div>
            {reasoningText.length > 0 && (
              <div className="text-xs font-mono">
                {reasoningText.length} chars
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced markdown components that handle both math and financial content
const markdownComponents = {
  img: ({ src, alt, ...props }: any) => {
    // Don't render image if src is empty or undefined
    if (!src || src.trim() === "") {
      return null;
    }

    // Validate URL - must be absolute URL or start with /
    try {
      // Check if it's a valid absolute URL
      new URL(src);
    } catch {
      // Check if it starts with / (valid relative path for Next.js)
      if (!src.startsWith("/")) {
        console.warn(`Invalid image src: ${src}. Skipping image render.`);
        return (
          <div className="text-xs text-gray-500 italic border border-gray-200 p-2 rounded">
            [Image: {alt || src}] (Invalid URL - academic content)
          </div>
        );
      }
    }

    return (
      <Image src={src} alt={alt || ""} width={500} height={300} {...props} />
    );
  },
  iframe: ({ src, ...props }: any) => {
    // Don't render iframe if src is empty or undefined
    if (!src || src.trim() === "") {
      return null;
    }
    return <iframe src={src} {...props} />;
  },
  math: ({ children }: any) => {
    // Render math content using KaTeX
    const mathContent =
      typeof children === "string" ? children : children?.toString() || "";

    try {
      const html = katex.renderToString(mathContent, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
      return (
        <span
          dangerouslySetInnerHTML={{ __html: html }}
          className="katex-math"
        />
      );
    } catch (error) {
      console.warn("KaTeX rendering error:", error);
      return (
        <code className="math-fallback bg-gray-100 px-1 rounded">
          {mathContent}
        </code>
      );
    }
  },
  // Handle academic XML tags commonly found in Wiley content
  note: ({ children }: any) => (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 pl-4 py-2 my-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-blue-600 dark:text-blue-400 font-medium">
          Note:
        </span>
        <div>{children}</div>
      </div>
    </div>
  ),
  t: ({ children }: any) => (
    <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">
      {children}
    </span>
  ),
  f: ({ children }: any) => <span className="italic">{children}</span>,
  // Handle other common academic tags
  ref: ({ children }: any) => (
    <span className="text-blue-600 dark:text-blue-400 text-sm">
      [{children}]
    </span>
  ),
  caption: ({ children }: any) => (
    <div className="text-sm text-gray-600 dark:text-gray-400 italic text-center my-2">
      {children}
    </div>
  ),
  figure: ({ children }: any) => (
    <div className="my-4 p-2 border border-gray-200 dark:border-gray-700 rounded">
      {children}
    </div>
  ),
};

// Memoized Markdown renderer to avoid re-parsing on unrelated state updates
const MemoizedMarkdown = memo(function MemoizedMarkdown({
  text,
}: {
  text: string;
}) {
  const enableRawHtml = (text?.length || 0) < 20000;
  const processed = useMemo(
    () => preprocessMarkdownText(cleanFinancialText(text || "")),
    [text]
  );
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={
        {
          ...markdownComponents,
          fg: ({ children }: any) => <>{children}</>,
        } as any
      }
      rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
      skipHtml={!enableRawHtml}
    >
      {processed}
    </ReactMarkdown>
  );
});

// Helper function to extract search results for carousel display
const extractSearchResults = (jsonOutput: string) => {
  try {
    const data = JSON.parse(jsonOutput);

    if (data.results && Array.isArray(data.results)) {
      const mappedResults = data.results.map((result: any, index: number) => {
        // Handle different result structures
        // Clinical trials overview has fields directly on result (nct_id, brief_summary, etc.)
        // Other tools have content field that might be string or object

        let content = result.content || "";
        let summary = result.brief_summary || "";

        // If content is an object (like earnings data), stringify it
        if (typeof content === "object" && content !== null) {
          content = JSON.stringify(content, null, 2);
        }

        // Use brief_summary if available (clinical trials), otherwise use content
        if (!summary) {
          summary =
            typeof content === "string" && content.length > 150
              ? content.substring(0, 150) + "..."
              : content;
        }

        return {
          id: String(
            // Prefer tool-supplied stable id when available
            (result as any).id ||
              // Fall back to domain identifiers when present
              result.nct_id ||
              result.doi ||
              result.url ||
              // Last resort: local index (not stable across messages)
              index
          ),
          title:
            typeof result.title === "string"
              ? result.title
              : result.title?.name ||
                result.title?.text ||
                JSON.stringify(result.title) ||
                `Result ${index + 1}`,
          summary: summary || "No summary available",
          source: result.source || result.metadata?.source || "Unknown source",
          date: result.date || result.start_date || "",
          url: result.url || "",
          fullContent:
            result.brief_summary || content || "No content available",
          isStructured: result.dataType === "structured",
          dataType: result.dataType || "unstructured",
          length: result.length,
          imageUrls: result.imageUrl || result.image_url || {},
          relevanceScore: result.relevanceScore || result.relevance_score || 0,
          // Include clinical trial specific fields if present
          nctId: result.nct_id,
          status: result.status,
          phase: result.phase,
          enrollment: result.enrollment,
          conditions: result.conditions,
          interventions: result.interventions,
        };
      });

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

// Search Result Card Component
export const SearchResultCard = ({
  result,
  type,
  variant = "default",
  onRemove,
}: {
  result: any;
  type: "financial" | "web" | "wiley" | "healthcare";
  variant?: "default" | "saved";
  onRemove?: () => void;
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

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

  const saved = useSavedResults();
  const savedPayload = useMemo<SavedItem>(
    () => ({
      id: String(result.id ?? ""),
      title:
        typeof result.title === "string"
          ? result.title
          : String(result.title ?? "Untitled Result"),
      url: result.url ?? undefined,
      source: result.source ?? undefined,
      type,
      date: result.date ?? undefined,
      data: result,
    }),
    [result, type]
  );
  const initialLiked = saved.has(savedPayload.id);
  const hasCollections = saved.collections.length > 0;
  const isSavedVariant = variant === "saved";
  const [menuOpen, setMenuOpen] = useState(false);
  const [markedCollections, setMarkedCollections] = useState<string[]>(() =>
    initialLiked && saved.activeCollectionId ? [saved.activeCollectionId] : []
  );
  const liked = initialLiked || markedCollections.length > 0;
  const cardClassName =
    variant === "saved"
      ? "cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0"
      : "cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0";

  useEffect(() => {
    const activeId = saved.activeCollectionId;
    if (!activeId) return;
    setMarkedCollections((prev) => {
      if (initialLiked) {
        return prev.includes(activeId) ? prev : [...prev, activeId];
      }
      return prev.filter((id) => id !== activeId);
    });
  }, [initialLiked, saved.activeCollectionId]);

  const handleRemove = () => {
    if (isSavedVariant) {
      if (onRemove) onRemove();
      else saved.remove(savedPayload.id);
    } else {
      saved.remove(savedPayload.id);
      if (saved.activeCollectionId) {
        setMarkedCollections((prev) =>
          prev.filter((id) => id !== saved.activeCollectionId)
        );
      }
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    try {
      const alreadyMarked = markedCollections.includes(collectionId);
      if (alreadyMarked) {
        await saved.removeFromCollection(collectionId, savedPayload.id);
        setMarkedCollections((prev) =>
          prev.filter((id) => id !== collectionId)
        );
      } else {
        await saved.addToCollection(collectionId, savedPayload);
        setMarkedCollections((prev) => [...prev, collectionId]);
      }
    } catch (error) {
      console.error("Failed to save result", error);
    }
  };

  const handleCreateCollectionAndSave = async () => {
    const name = window.prompt("Collection name");
    const title = name?.trim();
    if (!title) return;
    try {
      const newId = await saved.createCollection(title);
      if (!newId) return;
      await saved.addToCollection(newId, savedPayload);
      setMarkedCollections((prev) => [...prev, newId]);
      setMenuOpen(false);
    } catch (error) {
      console.error("Failed to create and save to collection", error);
    }
  };

  // Hide save controls for uploaded user data
  const isUploadedItem =
    (savedPayload.source || result?.source) === "Uploaded file";

  const ActionButton = () => {
    if (isUploadedItem) return null;
    if (isSavedVariant) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          title="Remove from library"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    }

    // Hide save button if user is not signed in
    if (!user) return null;

    return (
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={liked ? "text-blue-600" : "text-gray-400"}
            onClick={(e) => e.stopPropagation()}
            title={liked ? "Saved" : "Save result"}
          >
            {liked ? (
              <Book className="w-4 h-4" />
            ) : (
              <BookDashed className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-56 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {user ? (
            <>
              <DropdownMenuLabel className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Save to collection</span>
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </DropdownMenuLabel>

              {hasCollections && (
                <>
                  {saved.collections.map((collection) => (
                    <DropdownMenuItem
                      key={collection.id}
                      className="flex items-center justify-between gap-2 text-[11px]"
                      onSelect={(event) => {
                        event.preventDefault();
                        void handleSaveToCollection(collection.id);
                      }}
                    >
                      <span>{collection.title}</span>
                      {markedCollections.includes(collection.id) && (
                        <Check className="h-3 w-3 text-green-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                className="text-[11px]"
                onSelect={(event) => {
                  event.preventDefault();
                  void handleCreateCollectionAndSave();
                }}
              >
                {hasCollections
                  ? "New collection…"
                  : "Create collection to save"}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              className="text-[11px]"
              onSelect={(event) => {
                event.preventDefault();
                saved.toggle(savedPayload);
              }}
            >
              {liked ? "Remove from saved" : "Save locally"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
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
          data-result-id={result.id}
          data-tool={type}
          className={cardClassName}
          onClick={() => setIsDialogOpen(true)}
        >
          <CardContent className="h-full">
            <div className="flex flex-col justify-between space-y-2 h-full">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                    {typeof result.title === "string"
                      ? result.title
                      : String(result.title)}
                  </h4>
                  <div className="flex items-center gap-2 ml-2">
                    <ActionButton />
                  </div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                  {result.summary}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      result.isStructured
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    }`}
                  >
                    {result.dataType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="truncate px-2 rounded text-xs bg-gray-100 dark:bg-gray-800 py-0.5 max-w-[150px]">
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
          title={
            typeof result.title === "string"
              ? result.title
              : String(result.title)
          }
          content={content}
          isJson={result.isStructured}
        />
      </>
    );
  }

  // Non-virtualized card
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card
          data-result-id={result.id}
          data-tool={type}
          className={cardClassName}
        >
          <CardContent className="h-full">
            <div className="flex flex-col justify-between space-y-2 h-full">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                    {typeof result.title === "string"
                      ? result.title
                      : String(result.title)}
                  </h4>
                  <div className="flex items-center gap-2 ml-2">
                    <ActionButton />
                  </div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                  {result.summary}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      result.isStructured
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    }`}
                  >
                    {result.dataType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pl-2">
                  {type === "wiley" ? (
                    <img
                      src="/wy.svg"
                      alt="Wiley"
                      className="w-10 h-10 dark:invert opacity-80"
                    />
                  ) : (
                    <span className="truncate px-2 rounded text-xs bg-gray-100 dark:bg-gray-800 py-0.5 max-w-[150px]">
                      {(() => {
                        try {
                          const urlObj = new URL(result.url);
                          return urlObj.hostname.replace(/^www\./, "");
                        } catch {
                          return result.url;
                        }
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:w-[85vw] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className=" pr-8">{result.title}</DialogTitle>
          <Separator />
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* <span>{result.source}</span> */}
              {result.date && <span>• {result.date}</span>}
              {result.relevanceScore && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {(result.relevanceScore * 100).toFixed(0)}% relevance
                </span>
              )}
              {type === "wiley" && result.doi && (
                <span className="text-xs bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">
                  DOI: {result.doi}
                </span>
              )}
            </div>

            {type === "wiley" && (result.authors || result.citation) && (
              <div className="space-y-1">
                {result.authors && result.authors.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Authors:</span>{" "}
                    {result.authors.join(", ")}
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

// Compact card for previously fetched items
const PreviouslyFetchedCard = ({
  result,
  originalMessageId,
  toolName,
}: {
  result: any;
  originalMessageId: string;
  toolName?: string;
}) => {
  const handleScrollToOriginal = () => {
    // Always force a scroll, even if already in view
    const container = document.querySelector(
      `[data-message-id="${originalMessageId}"]`
    ) as HTMLElement | null;
    if (!container) return;

    // Find the result card inside the message
    const rawId = String(result?.id ?? "");
    if (!rawId) return;
    const escaped =
      (window as any).CSS && (CSS as any).escape
        ? (CSS as any).escape(rawId)
        : rawId.replace(/"/g, '\\"');
    const baseSelector = `[data-result-id="${escaped}"]`;
    const toolSelector = toolName ? `[data-tool="${toolName}"]` : "";
    const selector = toolSelector
      ? `${toolSelector}${baseSelector}`
      : baseSelector;

    // Only try to find the target result card inside this message
    const target = container.querySelector(selector) as HTMLElement | null;
    if (!target) {
      return;
    }

    // Find the carousel scroller (prefer same tool)
    const scrollerSelector = toolSelector
      ? `[data-carousel="results"][data-tool="${toolName}"][data-message-id="${originalMessageId}"]`
      : `[data-carousel="results"][data-message-id="${originalMessageId}"]`;
    let scroller = (target.closest(scrollerSelector) ||
      container.querySelector(scrollerSelector)) as HTMLElement | null;
    if (!scroller) {
      scroller = (target.closest('[data-carousel="results"]') ||
        container.querySelector(
          '[data-carousel="results"]'
        )) as HTMLElement | null;
    }

    // Always scroll the message into view vertically first (centered)
    // Force scroll even if already in view by using block: "center" and scroll-behavior: "auto" first, then "smooth"
    const tRect = target.getBoundingClientRect();
    const absoluteTop = window.scrollY + tRect.top;
    const top = Math.max(
      0,
      absoluteTop - (window.innerHeight - target.clientHeight) / 2
    );
    window.scrollTo({ top, behavior: "auto" });
    setTimeout(() => window.scrollTo({ top, behavior: "smooth" }), 10);

    // After a short delay, scroll the carousel horizontally to center the card, then highlight
    setTimeout(() => {
      // Always scroll the result card into view (centered horizontally in carousel if possible)
      if (scroller && target) {
        try {
          const tRect = target.getBoundingClientRect();
          const sRect = scroller.getBoundingClientRect();
          const absoluteLeft = scroller.scrollLeft + (tRect.left - sRect.left);
          const left = Math.max(
            0,
            absoluteLeft - (scroller.clientWidth - target.clientWidth) / 2
          );
          // Force scroll by first jumping, then smooth scroll
          scroller.scrollTo({ left, behavior: "auto" });
          setTimeout(() => {
            scroller.scrollTo({ left, behavior: "smooth" });
          }, 10);
        } catch {
          // Fallback when smooth options not supported
          target.scrollIntoView({
            behavior: "auto",
            inline: "center",
            block: "nearest",
          } as ScrollIntoViewOptions);
          setTimeout(() => {
            target.scrollIntoView({
              behavior: "smooth",
              inline: "center",
              block: "nearest",
            } as ScrollIntoViewOptions);
          }, 10);
        }
      }
      // Always scroll the card into view (in case not visible)

      // Brief purple highlight
      const highlight = [
        "shadow-[0_0_0_6px_rgba(168,85,247,0.7)]",
        "ring-4",
        "ring-purple-400",
        "animate-pulse",
      ];
      target.classList.add(...highlight);
      setTimeout(() => {
        target.classList.remove(...highlight);
      }, 2000);
    }, 200); // Slightly longer delay to allow vertical scroll to finish
  };
  console.log("scrolled to original data:", originalMessageId);

  return (
    <Card className="min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
      <CardContent className="py-3">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Previously fetched in this chat
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
            {typeof result.title === "string"
              ? result.title
              : String(result.title)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={handleScrollToOriginal}
            >
              Jump to original
            </Button>
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                Source
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Search Results Carousel Component
const SearchResultsCarousel = ({
  results,
  type,
  messageId,
  toolName,
}: {
  results: any[];
  type: "financial" | "web" | "wiley" | "healthcare";
  messageId: string;
  toolName?: string;
}) => {
  const seen = useSeenResults();
  const scrollRef = useRef<HTMLDivElement>(null);
  const imagesScrollRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  // Local, within-query dedupe to remove accidental repeats before rendering
  const normalizeUrlClient = (url?: string) => {
    if (!url) return "";
    try {
      const u = new URL(url);
      u.hash = "";
      // strip common tracking params
      const toDelete: string[] = [];
      u.searchParams.forEach((_, k) => {
        if (k.startsWith("utm_") || k === "ref" || k === "ref_src")
          toDelete.push(k);
      });
      toDelete.forEach((k) => u.searchParams.delete(k));
      const host = u.host.toLowerCase();
      const path = u.pathname.replace(/\/+$/, "");
      const qs = u.searchParams.toString();
      return `${u.protocol}//${host}${path}${qs ? `?${qs}` : ""}`;
    } catch {
      return (url || "").trim();
    }
  };

  const dedupedResults = useMemo(() => {
    const seenLocal = new Set<string>();
    const out: any[] = [];
    for (const r of results || []) {
      const id = String(r?.id ?? "");
      const key =
        id ||
        r.nctId ||
        r.doi ||
        normalizeUrlClient(r.url) ||
        `${(r.title || "").toLowerCase()}|${(r.source || "").toLowerCase()}|${
          r.date || ""
        }`;
      if (seenLocal.has(key)) continue;
      seenLocal.add(key);
      out.push(r);
    }
    return out;
  }, [results]);

  // Extract all images from results
  const allImages: { url: string; title: string; sourceUrl: string }[] = [];
  const firstImages: { url: string; title: string; sourceUrl: string }[] = [];

  dedupedResults.forEach((result) => {
    let firstImageAdded = false;
    if (result.imageUrls && typeof result.imageUrls === "object") {
      Object.values(result.imageUrls).forEach((imageUrl: any) => {
        if (typeof imageUrl === "string" && imageUrl.trim()) {
          const imageData = {
            url: imageUrl,
            title: result.title,
            sourceUrl: result.url,
          };
          allImages.push(imageData);

          // Add only the first image per result to firstImages
          if (!firstImageAdded) {
            firstImages.push(imageData);
            firstImageAdded = true;
          }
        }
      });
    }
  });

  const handleImageClick = (idx: number) => {
    setSelectedIndex(idx);
    setDialogOpen(true);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length
    );
  };
  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % allImages.length);
  };

  useEffect(() => {
    if (!dialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") setDialogOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, allImages.length, handleNext, handlePrev]);

  if (dedupedResults.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        No results found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Results Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          data-carousel="results"
          data-tool={type}
          data-message-id={messageId}
          className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1 sm:px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {dedupedResults.map((result) => {
            const resultId = String(result?.id ?? "");
            // Register first-seen results in the session cache
            if (resultId) {
              if (!seen.has(resultId)) {
                seen.setIfAbsent({
                  id: resultId,
                  tool: toolName || type,
                  messageId,
                  result,
                });
              }
            }

            // If we've seen this result in a previous message, show a compact reference card
            const seenEntry = resultId ? seen.get(resultId) : undefined;
            const isPreviouslyFetched =
              seenEntry && seenEntry.messageId !== messageId;

            // If we've seen this result in a previous message, show a compact reference card first
            if (isPreviouslyFetched) {
              return (
                <PreviouslyFetchedCard
                  key={result.id}
                  result={result}
                  originalMessageId={seenEntry!.messageId}
                  toolName={type}
                />
              );
            }

            // Check if this is clinical trials data
            if (
              result.source === "valyu/valyu-clinical-trials" &&
              result.fullContent
            ) {
              // Try to parse the content to check if it's valid clinical trial JSON
              try {
                const parsed =
                  typeof result.fullContent === "string"
                    ? JSON.parse(result.fullContent)
                    : result.fullContent;
                if (parsed.nct_id || parsed.brief_title) {
                  // This is clinical trial data, use the special view
                  return (
                    <div
                      key={result.id}
                      data-result-id={result.id}
                      data-tool={type}
                      className="min-w-[280px] sm:min-w-[320px] max-w-[320px] sm:max-w-[380px] flex-shrink-0"
                    >
                      <ClinicalTrialsView
                        result={{
                          content: result.fullContent,
                          title: result.title,
                          url: result.url,
                          source: result.source,
                        }}
                        mode="preview"
                        height="300px"
                      />
                    </div>
                  );
                }
              } catch (e) {
                // Not valid clinical trial JSON, render as normal
              }
            }

            return (
              <SearchResultCard key={result.id} result={result} type={type} />
            );
          })}
        </div>
      </div>

      {/* Images Carousel - Only show if there are images */}
      {allImages.length > 0 && (
        <div className="relative">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
            Related Images
          </div>
          <div
            ref={imagesScrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1 sm:px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {(showAllImages ? allImages : firstImages).map((image, index) => (
              <div
                key={index}
                className="flex-shrink-0 cursor-pointer group"
                onClick={() => {
                  // When clicking an image, use the correct index from allImages
                  const realIndex = allImages.findIndex((img) => img === image);
                  handleImageClick(realIndex);
                }}
              >
                <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                  <Image
                    src={image.url}
                    width={200}
                    height={150}
                    alt={image.title}
                    className="h-24 sm:h-32 w-36 sm:w-48 object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs line-clamp-2">
                      {image.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Show expand/collapse button if there are more images than first images */}
            {allImages.length > firstImages.length && (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{ minWidth: "120px" }}
              >
                <button
                  onClick={() => setShowAllImages(!showAllImages)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {showAllImages ? (
                    <>Show less</>
                  ) : (
                    <>+{allImages.length - firstImages.length} more</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Dialog for image carousel */}
          {dialogOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setDialogOpen(false)}
            >
              <div
                className="relative max-w-3xl w-full flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 z-10"
                  onClick={() => setDialogOpen(false)}
                  aria-label="Close"
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="flex items-center justify-center w-full h-[60vh]">
                  <button
                    className="text-white bg-black/40 hover:bg-black/70 rounded-full p-2 absolute left-2 top-1/2 -translate-y-1/2 z-10"
                    onClick={handlePrev}
                    aria-label="Previous"
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <Image
                    src={allImages[selectedIndex].url}
                    alt={allImages[selectedIndex].title}
                    width={800}
                    height={600}
                    className="max-h-[60vh] max-w-full rounded-lg shadow-lg mx-8"
                  />
                  <button
                    className="text-white bg-black/40 hover:bg-black/70 rounded-full p-2 absolute right-2 top-1/2 -translate-y-1/2 z-10"
                    onClick={handleNext}
                    aria-label="Next"
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-lg font-medium text-white mb-2 line-clamp-2">
                    {allImages[selectedIndex].title}
                  </div>
                  <a
                    href={allImages[selectedIndex].sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-200 underline hover:text-blue-400 text-sm"
                  >
                    View Source
                  </a>
                  <div className="text-xs text-gray-300 mt-2">
                    {selectedIndex + 1} / {allImages.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function ChatInterface({
  sessionId,
  onMessagesChange,
  onRateLimitError,
  onSessionCreated,
  onNewChat,
  rateLimitProps,
  fastMode: fastModeProp,
  onFastModeChange,
}: {
  sessionId?: string;
  onMessagesChange?: (hasMessages: boolean) => void;
  onRateLimitError?: (resetTime: string) => void;
  onSessionCreated?: (sessionId: string) => void;
  onNewChat?: () => void;
  rateLimitProps?: {
    allowed?: boolean;
    remaining?: number;
    resetTime?: Date;
    increment: () => Promise<any>;
  };
  fastMode?: boolean;
  onFastModeChange?: (v: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    undefined
  );
  const sessionIdRef = useRef<string | undefined>(undefined);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const userHasInteracted = useRef(false);

  const [isFormAtBottom, setIsFormAtBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [showLibraryCard, setShowLibraryCard] = useState(false);
  const [libraryCollectionId, setLibraryCollectionId] = useState<string | null>(
    null
  );
  const [libraryContextItems, setLibraryContextItems] = useState<SavedItem[]>(
    []
  );
  const [libraryContextExpanded, setLibraryContextExpanded] = useState(false);
  const [contextResourceMap, setContextResourceMap] = useState<
    Record<string, SavedItem[]>
  >({});
  const [fastMode, setFastMode] = useState(false);
  const [inputMenuOpen, setInputMenuOpen] = useState(false);
  const [showFileDropzone, setShowFileDropzone] = useState(false);
  const [dropzoneFiles, setDropzoneFiles] = useState<File[] | undefined>(
    undefined
  );
  const [uploadingFiles, setUploadingFiles] = useState<
    Record<
      string,
      {
        fileName: string;
        abortController: AbortController;
      }
    >
  >({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const libraryContextRef = useRef<SavedItem[]>([]);
  const lastSentContextRef = useRef<SavedItem[]>([]);
  const messageIdsRef = useRef<string[]>([]);
  const effectiveFastMode = fastModeProp ?? fastMode;
  const setEffectiveFastMode = onFastModeChange ?? setFastMode;
  // Ref to always send the freshest fastMode to the API
  const fastModeRef = useRef(false);
  useEffect(() => {
    fastModeRef.current = effectiveFastMode;
  }, [effectiveFastMode]);

  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    collections: savedCollections,
    items: savedItems,
    activeCollectionId: savedActiveCollectionId,
    setActiveCollection,
  } = useSavedResults();
  // Rate limit props passed from parent
  const { allowed, remaining, resetTime, increment } = rateLimitProps || {};
  const canSendQuery = allowed;

  // Optimistic rate limit increment mutation
  const rateLimitMutation = useMutation({
    mutationFn: async () => {
      // This is a dummy mutation since the actual increment happens server-side
      return Promise.resolve();
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["rateLimit"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(["rateLimit"]);

      // Optimistically update
      queryClient.setQueryData(["rateLimit"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          used: (old.used || 0) + 1,
          remaining: Math.max(0, (old.remaining || 0) - 1),
          allowed: (old.used || 0) + 1 < (old.limit || 5),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["rateLimit"], context.previousData);
      }
    },
    // No onSettled - let the optimistic update persist until chat finishes
  });

  const openLibraryCard = useCallback(() => {
    setShowLibraryCard(true);
    setInputMenuOpen(false);
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const exponent = Math.min(
      units.length - 1,
      Math.floor(Math.log(bytes) / Math.log(1024))
    );
    const size = bytes / Math.pow(1024, exponent);
    const precision = size >= 10 || exponent === 0 ? 0 : 1;
    return `${size.toFixed(precision)} ${units[exponent]}`;
  }, []);

  const createSavedItemFromFile = useCallback(
    (file: File): SavedItem => {
      const uniqueId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return {
        id: `upload-${uniqueId}`,
        title: file.name || "Untitled file",
        source: "Uploaded file",
        type: "web",
        date:
          typeof file.lastModified === "number"
            ? new Date(file.lastModified).toISOString()
            : undefined,
        data: {
          summary: `User uploaded file (${formatFileSize(file.size)}).`,
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
        },
      } satisfies SavedItem;
    },
    [formatFileSize]
  );

  const uploadSingleFile = useCallback(
    async (file: File, signal?: AbortSignal) => {
      try {
        const form = new FormData();
        form.append("files", file);
        const res = await fetch("/api/uploads", {
          method: "POST",
          body: form,
          signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        const result = data?.files?.[0];
        if (!result) return null;

        return {
          url: result.url,
          signedUrl: result.signedUrl,
          publicUrl: result.publicUrl,
          extractedText: result.extractedText,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Upload cancelled by user");
          return null; // Return null if cancelled
        }
        return null;
      }
    },
    []
  );

  const uploadFilesAndAnnotate = useCallback(
    async (files: File[], signal?: AbortSignal) => {
      try {
        const form = new FormData();
        for (const f of files) form.append("files", f);
        const res = await fetch("/api/uploads", {
          method: "POST",
          body: form,
          signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        const map: Record<
          string,
          {
            url?: string;
            signedUrl?: string;
            publicUrl?: string;
            extractedText?: string;
          }
        > = {};
        for (const r of data?.files || []) {
          map[r.name] = {
            url: r.url,
            signedUrl: r.signedUrl,
            publicUrl: r.publicUrl,
            extractedText: r.extractedText,
          };
        }
        return map;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Upload cancelled by user");
          return null;
        }
        return null;
      }
    },
    []
  );

  const handleIncomingFiles = useCallback(
    async (files: File[]) => {
      if (!files?.length) return;

      console.log(
        "[Chat Interface] Processing files:",
        files.map((f) => f.name)
      );

      // Process each file individually
      for (const file of files) {
        const fileId = `${file.name}-${Date.now()}`;
        const abortController = new AbortController();

        // Add to uploading files state
        setUploadingFiles((prev) => ({
          ...prev,
          [fileId]: {
            fileName: file.name,
            abortController,
          },
        }));

        try {
          const result = await uploadSingleFile(file, abortController.signal);

          if (result) {
            // Create saved item for successful upload
            const base = createSavedItemFromFile(file);
            const extractedText = result.extractedText;

            console.log(
              `[Chat Interface] File ${file.name} extracted text length:`,
              extractedText?.length || 0
            );

            const newItem = {
              ...base,
              data: {
                ...((base.data as any) || {}),
                extractedText,
                summary: extractedText
                  ? `User uploaded file (${formatFileSize(
                      file.size
                    )}). Extracted text: ${extractedText.substring(0, 200)}${
                      extractedText.length > 200 ? "..." : ""
                    }`
                  : `User uploaded file (${formatFileSize(file.size)}).`,
              },
            } as SavedItem;

            setLibraryContextItems((prev) => {
              const next = [...prev, newItem];
              console.log(
                "[Chat Interface] Updated library context items:",
                next.length
              );
              return next;
            });
          } else {
            console.log(
              `[Chat Interface] Upload was cancelled or failed for ${file.name}`
            );
          }
        } catch (error) {
          console.error(
            `[Chat Interface] Error processing file ${file.name}:`,
            error
          );
        } finally {
          // Remove from uploading files state
          setUploadingFiles((prev) => {
            const { [fileId]: removed, ...rest } = prev;
            return rest;
          });
        }
      }
    },
    [createSavedItemFromFile, uploadSingleFile, formatFileSize]
  );

  const cancelUpload = useCallback(() => {
    // Cancel all file uploads
    setUploadingFiles((prev) => {
      Object.values(prev).forEach((fileUpload) => {
        fileUpload.abortController.abort();
      });
      return {};
    });
  }, []);

  const cancelFileUpload = useCallback((fileId: string) => {
    setUploadingFiles((prev) => {
      const fileUpload = prev[fileId];
      if (fileUpload) {
        fileUpload.abortController.abort();
        const { [fileId]: removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const handleFileDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      setDropzoneFiles(acceptedFiles);
      // trigger async upload + context append
      void handleIncomingFiles(acceptedFiles);
      setShowFileDropzone(false);
    },
    [handleIncomingFiles]
  );

  const handleFileMenuSelect = useCallback(() => {
    setDropzoneFiles(undefined);
    setShowFileDropzone(true);
    setInputMenuOpen(false);
  }, []);

  const closeFileDropzone = useCallback(() => {
    setShowFileDropzone(false);
  }, []);

  const handleAddLibraryContext = useCallback((item: SavedItem) => {
    setLibraryContextItems((prev) => {
      if (prev.some((existing) => existing.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const handleRemoveLibraryContext = useCallback((id: string) => {
    setLibraryContextItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearLibraryContext = useCallback(() => {
    setLibraryContextItems([]);
    setLibraryContextExpanded(false);
    libraryContextRef.current = [];
    setDropzoneFiles(undefined);
  }, []);

  const handleLibraryCollectionChange = useCallback(
    (value: string) => {
      setLibraryCollectionId(value);
      if (value !== savedActiveCollectionId) {
        setActiveCollection(value);
      }
    },
    [savedActiveCollectionId, setActiveCollection]
  );

  const summariseSavedItem = useCallback((item: SavedItem) => {
    if (!item?.data) return "";
    const data = item.data as any;

    const candidates = [
      data?.extractedText, // Prioritize extracted text from uploaded files
      data?.fullContent,
      data?.summary,
      data?.brief_summary,
      data?.content,
      data?.description,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        const trimmed = candidate.trim();
        return trimmed.length > 4000 ? `${trimmed.slice(0, 4000)}…` : trimmed;
      }
    }

    if (typeof data === "string") {
      const trimmed = data.trim();
      return trimmed.length > 4000 ? `${trimmed.slice(0, 4000)}…` : trimmed;
    }

    try {
      const json = JSON.stringify(data, null, 2);
      if (!json) return "";
      return json.length > 4000 ? `${json.slice(0, 4000)}…` : json;
    } catch (error) {
      return "";
    }
  }, []);

  const formatSavedItemForCard = useCallback((item: SavedItem) => {
    const data = (item.data as Record<string, any>) || {};

    const fullContentRaw = (() => {
      if (typeof data.fullContent === "string") return data.fullContent;
      if (data.fullContent) return JSON.stringify(data.fullContent, null, 2);
      if (typeof data.content === "string") return data.content;
      if (typeof data.summary === "string") return data.summary;
      if (typeof data.brief_summary === "string") return data.brief_summary;
      return "";
    })();

    const fullContent = fullContentRaw || "";

    const summary =
      data.summary ??
      data.brief_summary ??
      (typeof fullContent === "string" ? fullContent.slice(0, 240) : "");

    return {
      ...data,
      id: item.id,
      title:
        typeof item.title === "string" && item.title.trim()
          ? item.title
          : data.title ?? "Untitled result",
      summary,
      fullContent,
      url: item.url ?? data.url ?? "",
      source: item.source ?? data.source ?? "",
      date: item.date ?? data.date ?? "",
      dataType: data.dataType ?? item.type ?? "unstructured",
      isStructured:
        typeof data.isStructured === "boolean"
          ? data.isStructured
          : data.dataType === "structured",
      imageUrls: data.imageUrls ?? data.image_url ?? {},
      relevanceScore: data.relevanceScore ?? data.relevance_score ?? 0,
      doi: data.doi ?? data.metadata?.doi,
      authors: data.authors,
      citation: data.citation,
      nctId: data.nctId ?? data.nct_id,
      status: data.status,
      phase: data.phase,
      enrollment: data.enrollment,
      conditions: data.conditions,
      interventions: data.interventions,
      type: item.type ?? (data.type as SavedItem["type"]) ?? "web",
    };
  }, []);

  const buildLibraryContextInstruction = useCallback(
    (question: string, items: SavedItem[]) => {
      if (items.length === 0) return question;

      console.log(
        "[Chat Interface] Building context instruction with items:",
        items.length
      );
      items.forEach((item, index) => {
        const details = summariseSavedItem(item);
        console.log(
          `[Chat Interface] Context item ${index + 1}: ${
            item.title
          }, content length: ${details?.length || 0}`
        );
      });

      const contextBlocks = items.map((item, index) => {
        const details = summariseSavedItem(item);
        const lines = [
          `Context [${index + 1}]`,
          `Title: ${item.title || "Untitled result"}`,
          item.source ? `Source: ${item.source}` : null,
          item.date ? `Date: ${item.date}` : null,
          item.url ? `URL: ${item.url}` : null,
          details ? `Full Content:\n${details}` : null,
        ].filter(Boolean);
        return lines.join("\n");
      });

      const enrichedText = `You must ground your answer in the provided saved context. Reference the content explicitly and do not ignore it. Use the user's natural-language question verbatim in your answer.\n\n${contextBlocks.join(
        "\n\n"
      )}\n\n[USER PROMPT]\n${question}`;

      console.log(
        "[Chat Interface] Enriched text length:",
        enrichedText.length
      );
      return enrichedText;
    },
    [summariseSavedItem]
  );

  const renderLibraryItems = useCallback(
    (items: SavedItem[]) => {
      if (!items || items.length === 0) {
        return (
          <div className="p-6 text-sm text-center text-gray-500 dark:text-gray-400">
            No saved results available yet.
          </div>
        );
      }

      return (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className="p-4 space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                {item.title || "Untitled result"}
              </div>
              {(item.source || item.date) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                  {item.source ? <span>{item.source}</span> : null}
                  {item.source && item.date ? <span>•</span> : null}
                  {item.date ? <span>{item.date}</span> : null}
                </div>
              )}
              {typeof item.data?.summary === "string" &&
                item.data.summary.trim() && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                    {item.data.summary.trim()}
                  </p>
                )}
              <div className="flex items-center justify-between gap-2 pt-2">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open source
                  </a>
                ) : (
                  <span />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-xs font-normal text-blue-600 hover:bg-gray-200/90 dark:text-blue-300 dark:hover:bg-gray-800/90 hover:py-2 dark:hover:py-2"
                  type="button"
                  onClick={() => handleAddLibraryContext(item)}
                  disabled={libraryContextItems.some(
                    (existing) => existing.id === item.id
                  )}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {libraryContextItems.some(
                    (existing) => existing.id === item.id
                  )
                    ? "Added"
                    : "Add to chat"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      );
    },
    [handleAddLibraryContext, libraryContextItems]
  );

  useEffect(() => {
    if (!showLibraryCard) return;

    if (!savedCollections || savedCollections.length === 0) {
      if (libraryCollectionId !== null) {
        setLibraryCollectionId(null);
      }
      return;
    }

    const selectionIsValid =
      libraryCollectionId !== null &&
      savedCollections?.some(
        (collection) => collection.id === libraryCollectionId
      );

    if (!selectionIsValid) {
      const fallbackId =
        (savedActiveCollectionId &&
        savedCollections?.some(
          (collection) => collection.id === savedActiveCollectionId
        )
          ? savedActiveCollectionId
          : savedCollections?.[0]?.id) ?? null;

      if (fallbackId && libraryCollectionId !== fallbackId) {
        setLibraryCollectionId(fallbackId);
      }

      if (fallbackId && fallbackId !== savedActiveCollectionId) {
        setActiveCollection(fallbackId);
      }
      return;
    }

    if (
      libraryCollectionId &&
      libraryCollectionId !== savedActiveCollectionId
    ) {
      setActiveCollection(libraryCollectionId);
    }
  }, [
    showLibraryCard,
    savedCollections,
    savedActiveCollectionId,
    libraryCollectionId,
    setActiveCollection,
  ]);

  const resolvedLibraryCollectionId = useMemo(() => {
    if (libraryCollectionId) return libraryCollectionId;
    if (
      savedActiveCollectionId &&
      savedCollections?.some(
        (collection) => collection.id === savedActiveCollectionId
      )
    ) {
      return savedActiveCollectionId;
    }
    return savedCollections?.[0]?.id ?? null;
  }, [libraryCollectionId, savedActiveCollectionId, savedCollections]);

  const librarySelectionPending =
    (savedCollections?.length || 0) > 0 &&
    libraryCollectionId !== null &&
    libraryCollectionId !== savedActiveCollectionId;

  const libraryContextBanner = useMemo(() => {
    if (libraryContextItems.length === 0) return null;

    const shorten = (title?: string | null) => {
      const base = (title || "Untitled result").trim();
      return base.length > 48 ? `${base.slice(0, 45)}…` : base;
    };

    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-blue-800 shadow-sm dark:border-blue-800/70 dark:bg-blue-900/20 dark:text-blue-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide">
            Context queued for next answer
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLibraryContextExpanded((prev) => !prev)}
              className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-300"
            >
              {libraryContextExpanded ? "Collapse" : "Expand"}
            </button>
            <button
              type="button"
              onClick={handleClearLibraryContext}
              className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-300"
            >
              Clear all
            </button>
          </div>
        </div>
        <div
          className={`mt-2 overflow-y-auto pr-1 space-y-2 ${
            libraryContextExpanded ? "max-h-160" : "max-h-12"
          }`}
        >
          {libraryContextItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-full border border-blue-200 bg-white/70 px-2 py-1 text-[11px] font-medium text-blue-700 shadow-sm dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
            >
              <span className="truncate max-w-[calc(100%-1.5rem)]">
                {shorten(item.title)}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveLibraryContext(item.id)}
                className="text-blue-600 transition-colors hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-50"
                aria-label={`Remove ${item.title ?? "context"}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    libraryContextItems,
    libraryContextExpanded,
    handleClearLibraryContext,
    handleRemoveLibraryContext,
  ]);

  const { selectedModel } = useOllama();
  const user = useAuthStore((state) => state.user);

  // Session management functions
  const generateSessionTitle = useCallback((firstMessage: string): string => {
    // Create a smart title from the first user message
    const cleaned = firstMessage.trim();

    // Financial keywords to prioritize in titles
    const financialKeywords = [
      "stock",
      "stocks",
      "share",
      "shares",
      "equity",
      "portfolio",
      "investment",
      "invest",
      "market",
      "trading",
      "trader",
      "dividend",
      "earnings",
      "revenue",
      "profit",
      "loss",
      "crypto",
      "bitcoin",
      "ethereum",
      "cryptocurrency",
      "finance",
      "financial",
      "analysis",
      "valuation",
      "dcf",
      "ratio",
      "ratios",
      "balance sheet",
      "income statement",
      "cash flow",
      "ipo",
      "merger",
      "acquisition",
      "bonds",
      "yield",
      "interest",
      "rate",
      "fed",
      "inflation",
      "gdp",
      "recession",
      "bull",
      "bear",
      "volatility",
      "risk",
      "return",
    ];

    // Company/ticker patterns
    const tickerPattern = /\b[A-Z]{1,5}\b/g;
    const dollarPattern = /\$[A-Z]{1,5}\b/g;

    // Extract potential tickers or companies mentioned
    const tickers = [
      ...(cleaned.match(tickerPattern) || []),
      ...(cleaned.match(dollarPattern) || []),
    ];

    if (cleaned.length <= 50) {
      return cleaned;
    }

    // Try to find a sentence with financial context
    const sentences = cleaned.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length <= 50) {
        // Check if this sentence contains financial keywords or tickers
        const hasFinancialContext =
          financialKeywords.some((keyword) =>
            trimmed.toLowerCase().includes(keyword.toLowerCase())
          ) || tickers.some((ticker) => trimmed.includes(ticker));

        if (hasFinancialContext) {
          return trimmed;
        }
      }
    }

    // If we have tickers, try to create a title around them
    if (tickers.length > 0) {
      const firstTicker = tickers[0];
      const tickerIndex = cleaned.indexOf(firstTicker);

      // Try to get context around the ticker
      const start = Math.max(0, tickerIndex - 20);
      const end = Math.min(
        cleaned.length,
        tickerIndex + firstTicker.length + 20
      );
      const context = cleaned.substring(start, end);

      if (context.length <= 50) {
        return context.trim();
      }
    }

    // Fall back to smart truncation
    const truncated = cleaned.substring(0, 47);
    const lastSpace = truncated.lastIndexOf(" ");
    const lastPeriod = truncated.lastIndexOf(".");
    const lastQuestion = truncated.lastIndexOf("?");

    const breakPoint = Math.max(lastSpace, lastPeriod, lastQuestion);
    const title =
      breakPoint > 20 ? truncated.substring(0, breakPoint) : truncated;

    return title + (title.endsWith(".") || title.endsWith("?") ? "" : "...");
  }, []);

  const createSession = useCallback(
    async (firstMessage: string): Promise<string | null> => {
      if (!user) return null;

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Use fast fallback title initially
        const quickTitle = generateSessionTitle(firstMessage);

        // Create session immediately with fallback title
        const response = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ title: quickTitle }),
        });

        if (response.ok) {
          const { session: newSession } = await response.json();
          console.log(
            "[Chat Interface] Created new session quickly:",
            newSession.id
          );

          // Generate better AI title in background (don't wait)
          fetch("/api/chat/generate-title", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ message: firstMessage }),
          })
            .then(async (titleResponse) => {
              if (titleResponse.ok) {
                const { title: aiTitle } = await titleResponse.json();
                // Update session title in background
                await fetch(`/api/chat/sessions/${newSession.id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({ title: aiTitle }),
                });
                console.log(
                  "[Chat Interface] Updated session title with AI:",
                  aiTitle
                );
              }
            })
            .catch(() => {
              console.log(
                "[Chat Interface] AI title generation failed, keeping fallback"
              );
            });

          return newSession.id;
        }
      } catch (error) {
        console.error("[Chat Interface] Failed to create session:", error);
      }
      return null;
    },
    [user, generateSessionTitle]
  );

  // Placeholder for loadSessionMessages - will be defined after useChat hook

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const headers: Record<string, string> = {};
          if (selectedModel) {
            headers["x-ollama-model"] = selectedModel;
          }
          console.log(
            "[Chat Interface] Preparing request, user:",
            user?.id || "anonymous"
          );
          console.log("[prepareSendMessagesRequest] fastMode =", fastMode);
          let enrichedMessages = messages;
          if (libraryContextRef.current.length > 0) {
            const pendingContext = libraryContextRef.current;
            lastSentContextRef.current = pendingContext;
            libraryContextRef.current = [];

            const lastUserIndex = [...messages]
              .map((msg) => msg.role)
              .lastIndexOf("user");

            if (lastUserIndex !== -1) {
              enrichedMessages = messages.map((message, index) => {
                if (index !== lastUserIndex) return message;

                const originalText = (() => {
                  if (Array.isArray((message as any).parts)) {
                    const textPart = (message as any).parts.find(
                      (part: any) =>
                        part?.type === "text" && typeof part.text === "string"
                    );
                    if (textPart) return textPart.text as string;
                  }
                  if (typeof (message as any).content === "string") {
                    return (message as any).content as string;
                  }
                  return "";
                })();

                const enrichedText = buildLibraryContextInstruction(
                  originalText,
                  pendingContext
                );

                if (Array.isArray((message as any).parts)) {
                  const updatedParts = (message as any).parts.map((part: any) =>
                    part?.type === "text"
                      ? { ...part, text: enrichedText }
                      : part
                  );
                  if (
                    !updatedParts.some((part: any) => part?.type === "text")
                  ) {
                    updatedParts.push({ type: "text", text: enrichedText });
                  }
                  return {
                    ...message,
                    parts: updatedParts,
                    contextResources: pendingContext,
                  } as typeof message;
                }

                if (typeof (message as any).content === "string") {
                  return {
                    ...message,
                    content: enrichedText,
                    contextResources: pendingContext,
                  } as typeof message;
                }

                return message;
              });
            }
          }

          // Convert any pending dropped files into base64 attachments for the API
          let attachments: any[] = [];
          try {
            if (Array.isArray(dropzoneFiles) && dropzoneFiles.length > 0) {
              attachments = await Promise.all(
                dropzoneFiles.map(async (f) => {
                  const buf = await f.arrayBuffer();
                  const dataBase64 = Buffer.from(buf).toString("base64");
                  const isImage = (f.type || "").startsWith("image/");
                  const isPdf =
                    (f.type || "").toLowerCase() === "application/pdf" ||
                    (f.name || "").toLowerCase().endsWith(".pdf");
                  let openaiResult: any = null;

                  if (isImage) {
                    // Use OpenAI's vision model to analyze the image
                    openaiResult = await generateText({
                      model: openai("gpt-4-vision-preview"),
                      messages: [
                        {
                          role: "user",
                          content: [
                            {
                              type: "image",
                              image: buf,
                            },
                            // Optionally, you can add a prompt here
                            // { type: "text", text: "Describe this image." }
                          ],
                        },
                      ],
                    });
                  } else if (isPdf) {
                    // Use OpenAI's GPT-5 model to analyze the PDF
                    openaiResult = await generateText({
                      model: openai("gpt-5"),
                      messages: [
                        {
                          role: "user",
                          content: [
                            {
                              type: "text",
                              text: "Please analyze the attached PDF file.",
                            },
                            {
                              type: "file",
                              data: buf,
                              mediaType: f.type,
                              filename: f.name,
                            },
                          ],
                        },
                      ],
                    });
                  }

                  return {
                    kind: isImage ? "image" : isPdf ? "pdf" : "file",
                    name: f.name,
                    mediaType:
                      f.type ||
                      (isImage
                        ? "image/png"
                        : isPdf
                        ? "application/pdf"
                        : "application/octet-stream"),
                    dataBase64,
                    openaiResult, // This will be null for non-images/non-pdfs, or the OpenAI result for images/pdfs
                  };
                })
              );
            }
          } catch (e) {
            console.warn("Failed to serialize attachments", e);
          }
          if (user) {
            const supabase = createClient();
            const {
              data: { session },
            } = await supabase.auth.getSession();
            console.log(
              "[Chat Interface] Session access_token exists:",
              !!session?.access_token
            );
            if (session?.access_token) {
              headers["Authorization"] = `Bearer ${session.access_token}`;
            }
          }

          // Rate limit increment is handled by the backend API

          return {
            body: {
              messages: enrichedMessages,
              sessionId: sessionIdRef.current,
              fastMode: fastModeRef.current,
              attachments,
            },
            headers,
          };
        },
      }),
    [
      selectedModel,
      user,
      increment,
      buildLibraryContextInstruction,
      dropzoneFiles,
    ]
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    setMessages,
    addToolResult,
  } = useChat<HealthcareUIMessage>({
    transport,
    // Automatically submit when all tool results are available
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      // Sync with server when chat completes (server has definitely processed increment by now)
      if (user) {
        console.log(
          "[Chat Interface] Chat finished, syncing rate limit with server"
        );
        queryClient.invalidateQueries({ queryKey: ["rateLimit"] });
      }
    },
  });

  useEffect(() => {
    const prevIds = messageIdsRef.current;
    const currentIds = messages.map((msg) => msg.id);
    const newUserMessage = [...messages]
      .reverse()
      .find((msg) => !prevIds.includes(msg.id) && msg.role === "user");

    setContextResourceMap((prev) => {
      const next: Record<string, SavedItem[]> = {};
      currentIds.forEach((id) => {
        if (prev[id]) {
          next[id] = prev[id];
        }
      });

      if (newUserMessage && lastSentContextRef.current.length > 0) {
        next[newUserMessage.id] = [...lastSentContextRef.current];
      }

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const mapsMatch =
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key]);

      if (mapsMatch) {
        return prev;
      }

      return next;
    });

    if (newUserMessage && lastSentContextRef.current.length > 0) {
      lastSentContextRef.current = [];
    }

    messageIdsRef.current = currentIds;
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setContextResourceMap((prev) => {
        if (Object.keys(prev).length === 0) {
          return prev;
        }
        return {};
      });
      messageIdsRef.current = [];
    }
  }, [messages.length]);

  // Session loading function - defined after useChat to access setMessages
  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      if (!user) return;

      setIsLoadingSession(true);
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(`/api/chat/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (response.ok) {
          let sessionData;
          try {
            sessionData = await response.json();
          } catch (jsonError) {
            console.error(
              "[Chat Interface] JSON parsing error when loading session:",
              jsonError
            );
            console.error("[Chat Interface] Response status:", response.status);
            console.error(
              "[Chat Interface] Response headers:",
              Object.fromEntries(response.headers.entries())
            );
            const responseText = await response.text();
            console.error("[Chat Interface] Response text:", responseText);
            throw new Error("Failed to parse session data");
          }

          const { messages: sessionMessages } = sessionData;
          console.log(
            "[Chat Interface] Loaded session messages:",
            sessionMessages.length
          );

          // Convert session messages to the format expected by useChat
          const convertedMessages = sessionMessages.map((msg: any) => {
            // Handle different content formats from the database
            let parts = msg.parts;

            // If parts is a string (legacy format), convert it to proper parts format
            if (typeof parts === "string") {
              parts = [{ type: "text", text: parts }];
            }

            // If parts is not an array, ensure it's properly formatted
            if (!Array.isArray(parts)) {
              parts = [{ type: "text", text: "No content found" }];
            }

            return {
              id: msg.id,
              role: msg.role,
              parts: parts,
              contextResources: msg.contextResources,
              toolCalls: msg.toolCalls,
              createdAt: msg.createdAt,
            };
          });

          // Set messages in the chat
          setMessages(convertedMessages);
          sessionIdRef.current = sessionId;
          setCurrentSessionId(sessionId);

          // Extract context resources from loaded messages
          const newContextResourceMap: Record<string, SavedItem[]> = {};
          convertedMessages.forEach((msg: any) => {
            if (msg.role === "user" && msg.contextResources) {
              newContextResourceMap[msg.id] = msg.contextResources;
            }
          });

          // Set the context resource map
          setContextResourceMap(newContextResourceMap);

          // Move form to bottom when loading a session with messages
          if (convertedMessages.length > 0) {
            setIsFormAtBottom(true);
          }

          // Scroll to bottom after loading messages
          setTimeout(() => {
            const c = messagesContainerRef.current;
            if (c) {
              console.log(
                "[Chat Interface] Scrolling to bottom after session load"
              );
              c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
            }
            // Also try the messagesEndRef as backup
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }, 500);
        }
      } catch (error) {
        console.error("[Chat Interface] Failed to load session:", error);
      } finally {
        setIsLoadingSession(false);
      }
    },
    [user, setMessages]
  );

  // Keep ref in sync with prop changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLibraryContextItems([]);
    }
  }, [sessionId]);

  // Load session once both the sessionId and user are ready
  useEffect(() => {
    if (!sessionId || !user) {
      if (sessionId && !user) {
        console.log(
          "[Chat Interface] Waiting for authenticated user before loading session"
        );
      }
      return;
    }

    if (sessionId !== currentSessionId) {
      console.log("[Chat Interface] Loading session:", sessionId);
      loadSessionMessages(sessionId);
    }
  }, [sessionId, user, currentSessionId, loadSessionMessages]);

  // Reset chat state when no session is selected
  useEffect(() => {
    if (sessionId !== undefined) return;
    if (!currentSessionId) return;

    console.log("[Chat Interface] Clearing for new chat");

    if (status === "streaming" || status === "submitted") {
      console.log("[Chat Interface] Stopping ongoing chat for new chat");
      stop();
    }

    setCurrentSessionId(undefined);
    setMessages([]);
    setInput("");
    setIsFormAtBottom(false);
    setEditingMessageId(null);
    setEditingText("");
    onNewChat?.();
  }, [sessionId, currentSessionId, status, stop, onNewChat]);

  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);

  // Check rate limit status
  useEffect(() => {
    setIsRateLimited(!canSendQuery);
  }, [canSendQuery]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        window.innerWidth <= 768 || // 768px is the sm breakpoint in Tailwind
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(isMobileDevice);
      // On mobile, always keep form at bottom
      if (isMobileDevice) {
        setIsFormAtBottom(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []); // Empty dependency array - only run on mount

  // Handle rate limit errors
  useEffect(() => {
    if (error) {
      console.log("[Chat Interface] Error occurred:", error);

      // Check if it's a rate limit error
      if (
        error.message &&
        (error.message.includes("RATE_LIMIT_EXCEEDED") ||
          error.message.includes("429"))
      ) {
        setIsRateLimited(true);
        try {
          // Try to extract reset time from error response
          const errorData = JSON.parse(error.message);
          const resetTime =
            errorData.resetTime ||
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          onRateLimitError?.(resetTime);
        } catch (e) {
          // Fallback: use default reset time (next day)
          const resetTime = new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString();
          onRateLimitError?.(resetTime);
        }
      }
    }
  }, [error]); // Remove onRateLimitError from dependencies to prevent infinite loops

  // Notify parent component about message state changes
  useEffect(() => {
    console.log("[Chat Interface] Messages changed, count:", messages.length);
    onMessagesChange?.(messages.length > 0);
  }, [messages.length]); // Remove onMessagesChange from dependencies to prevent infinite loops

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [anchorInView, setAnchorInView] = useState<boolean>(true);
  const [isAtBottomState, setIsAtBottomState] = useState<boolean>(true);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether we should stick to bottom (true when user is at bottom)
  const shouldStickToBottomRef = useRef<boolean>(true);
  // Defer messages to keep input responsive during streaming
  const deferredMessages = useDeferredValue(messages);
  // Lightweight virtualization for long threads
  const virtualizationEnabled = deferredMessages.length > 60;
  const [avgRowHeight, setAvgRowHeight] = useState<number>(140);
  const [visibleRange, setVisibleRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 30 });
  const overscan = 8;
  const updateVisibleRange = useCallback(() => {
    if (!virtualizationEnabled) return;
    const c = messagesContainerRef.current;
    if (!c) return;
    const minRow = 60;
    const rowH = Math.max(minRow, avgRowHeight);
    const containerH = c.clientHeight || 0;
    const start = Math.max(0, Math.floor(c.scrollTop / rowH) - overscan);
    const count = Math.ceil(containerH / rowH) + overscan * 2;
    const end = Math.min(deferredMessages.length, start + count);
    setVisibleRange((prev) => {
      if (prev.start === start && prev.end === end) {
        return prev;
      }
      return { start, end };
    });
  }, [virtualizationEnabled, avgRowHeight, overscan, deferredMessages.length]);
  useEffect(() => {
    if (!virtualizationEnabled) return;
    setVisibleRange((prev) => {
      const next = {
        start: 0,
        end: Math.min(deferredMessages.length, 30),
      };
      if (prev.start === next.start && prev.end === next.end) {
        return prev;
      }
      return next;
    });
    requestAnimationFrame(updateVisibleRange);
  }, [virtualizationEnabled, deferredMessages.length, updateVisibleRange]);
  useEffect(() => {
    const onResize = () => updateVisibleRange();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateVisibleRange]);

  // Helper: detect if messages container scrolls or if page scroll is used
  const isContainerScrollable = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    return container.scrollHeight > container.clientHeight + 2;
  };

  // Load query from URL params on initial load (but not when starting new chat)
  useEffect(() => {
    if (isStartingNewChat) {
      setIsStartingNewChat(false);
      return;
    }

    const queryParam = searchParams.get("q");
    if (queryParam && messages.length === 0) {
      let decodedQuery = queryParam;
      try {
        decodedQuery = decodeURIComponent(queryParam);
      } catch (e) {
        console.warn("Failed to decode query param:", e);
        // fallback: use raw queryParam
      }
      setInput(decodedQuery);
    } else if (!queryParam && messages.length === 0) {
      // Clear input if no query param and no messages (fresh start)
      setInput("");
    }
  }, [searchParams, messages.length, isStartingNewChat]);

  // Reset form position when all messages are cleared (except on mobile)
  useEffect(() => {
    if (messages.length === 0 && !isMobile) {
      setIsFormAtBottom(false);
    }
  }, [messages.length, isMobile]);

  // Check if user is at bottom of scroll (container only)
  const isAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const threshold = 5;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= threshold;
    console.log("[SCROLL DEBUG] isAtBottom (container):", {
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
      distanceFromBottom,
      threshold,
      atBottom,
    });
    return atBottom;
  };

  // Auto-scroll ONLY if already at bottom when new content arrives
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    console.log("[SCROLL DEBUG] Message update triggered:", {
      userHasInteracted: userHasInteracted.current,
      messageCount: messages.length,
      status,
      willAutoScroll: isAtBottomState,
      anchorInView,
      containerMetrics: (function () {
        const c = messagesContainerRef.current;
        if (!c) return null;
        return {
          scrollTop: c.scrollTop,
          scrollHeight: c.scrollHeight,
          clientHeight: c.clientHeight,
        };
      })(),
    });

    // ONLY auto-scroll if sticky is enabled AND streaming/submitted
    const isLoading = status === "submitted" || status === "streaming";
    if (isLoading && shouldStickToBottomRef.current) {
      console.log(
        "[SCROLL DEBUG] AUTO-SCROLLING because stick-to-bottom is enabled"
      );
      // Small delay to let content render
      requestAnimationFrame(() => {
        const c = messagesContainerRef.current;
        if (c && c.scrollHeight > c.clientHeight + 1) {
          console.log("[SCROLL DEBUG] Scrolling container to bottom");
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        } else {
          const doc = document.scrollingElement || document.documentElement;
          const targetTop = doc.scrollHeight;
          console.log("[SCROLL DEBUG] Scrolling window to bottom", {
            targetTop,
          });
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      });
    } else {
      console.log(
        "[SCROLL DEBUG] NOT auto-scrolling - stick-to-bottom disabled"
      );
    }
  }, [messages, status, isAtBottomState, anchorInView]);

  // Handle scroll events to track position and show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      console.log("[SCROLL DEBUG] Container not found in scroll handler!");
      return;
    }

    console.log(
      "[SCROLL DEBUG] Setting up scroll handlers on container:",
      container
    );

    const handleScroll = () => {
      const atBottom = isAtBottom();
      setIsAtBottomState(atBottom);
      console.log(
        "[SCROLL DEBUG] Scroll event fired (container), atBottom:",
        atBottom
      );
      // Disable sticky when not at bottom; re-enable when at bottom
      shouldStickToBottomRef.current = atBottom;
      userHasInteracted.current = !atBottom;
      updateVisibleRange();
    };

    const handleWindowScroll = () => {};

    // Handle wheel events to immediately detect scroll intent
    const handleWheel = (e: WheelEvent) => {
      console.log("[SCROLL DEBUG] Wheel event detected, deltaY:", e.deltaY);

      // If scrolling up, immediately disable auto-scroll
      if (e.deltaY < 0) {
        console.log(
          "[SCROLL DEBUG] User scrolling UP via wheel - disabling auto-scroll"
        );
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      } else if (e.deltaY > 0) {
        // Check if we're at bottom after scrolling down
        setTimeout(() => {
          const atBottom = isAtBottom();
          if (atBottom) {
            userHasInteracted.current = false; // Reset if back at bottom
            shouldStickToBottomRef.current = true;
            console.log(
              "[SCROLL DEBUG] User scrolled to bottom via wheel - enabling stick-to-bottom"
            );
          }
        }, 50);
      }
    };

    // Also handle touch events for mobile
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      if (deltaY > 10) {
        // Scrolling up
        console.log(
          "[SCROLL DEBUG] Touch scroll UP detected - disabling auto-scroll"
        );
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      }
    };

    // Add all event listeners
    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    // No window scroll listener needed when using container scrolling only

    // Also add to document level to catch all scroll attempts
    const handleGlobalWheel = (e: WheelEvent) => {
      const inContainer = container.contains(e.target as Node);
      if (inContainer) {
        console.log(
          "[SCROLL DEBUG] Global wheel event in container, deltaY:",
          e.deltaY
        );
        if (e.deltaY < 0) {
          console.log(
            "[SCROLL DEBUG] Global scroll UP - disabling auto-scroll"
          );
          userHasInteracted.current = true;
          shouldStickToBottomRef.current = false;
        }
        return;
      }
    };

    document.addEventListener("wheel", handleGlobalWheel, { passive: true });

    // Force sticky autoscroll by default
    setIsAtBottomState(true);
    shouldStickToBottomRef.current = true;
    userHasInteracted.current = false;

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("wheel", handleGlobalWheel);
      // No window scroll listener to remove
    };
  }, [updateVisibleRange]);

  // Observe bottom anchor visibility relative to the scroll container
  useEffect(() => {
    const container = messagesContainerRef.current;
    const anchor = bottomAnchorRef.current;
    if (!container || !anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => setAnchorInView(entry.isIntersecting),
      { root: container, threshold: 1.0 }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  // Scroll to bottom when user submits a message
  useEffect(() => {
    if (status === "submitted") {
      console.log("[SCROLL DEBUG] User submitted message, scrolling to bottom");
      userHasInteracted.current = false; // Reset interaction flag for new message
      shouldStickToBottomRef.current = true; // Re-enable stickiness on new message
      // Always scroll to bottom when user sends a message
      setTimeout(() => {
        const c = messagesContainerRef.current;
        if (c) {
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      // Check current rate limit status immediately before sending
      console.log("[Chat Interface] Rate limit check before submit:", {
        canSendQuery,
      });

      if (!canSendQuery) {
        // Rate limit exceeded - show dialog and don't send message or update URL
        console.log("[Chat Interface] Rate limit exceeded, showing dialog");
        setIsRateLimited(true);
        onRateLimitError?.(
          resetTime?.toISOString() || new Date().toISOString()
        );
        return;
      }

      console.log("[Chat Interface] Rate limit OK, proceeding with message");

      // Store the input to send
      const queryText = input.trim();
      if (libraryContextItems.length > 0) {
        libraryContextRef.current = [...libraryContextItems];
      } else {
        libraryContextRef.current = [];
      }

      // Clear input immediately before sending to prevent any display lag
      setInput("");

      // Track user query submission
      track("User Query Submitted", {
        query: queryText,
        queryLength: queryText.length,
        messageCount: messages.length,
        remainingQueries: remaining ? remaining - 1 : 0,
      });

      updateUrlWithQuery(queryText);
      // Move form to bottom when submitting (always true on mobile, conditional on desktop)
      if (!isFormAtBottom) {
        setIsFormAtBottom(true);
      }

      // Create session BEFORE sending message for proper usage tracking
      if (user && !currentSessionId && messages.length === 0) {
        console.log(
          "[Chat Interface] Creating session synchronously for first message"
        );
        try {
          const newSessionId = await createSession(queryText);
          if (newSessionId) {
            sessionIdRef.current = newSessionId;
            setCurrentSessionId(newSessionId);
            onSessionCreated?.(newSessionId);
            console.log(
              "[Chat Interface] Session created before message:",
              newSessionId
            );
          }
        } catch (error) {
          console.error("[Chat Interface] Failed to create session:", error);
          // Continue with message sending even if session creation fails
        }
      }

      // Increment rate limit for anonymous users (authenticated users handled server-side)
      if (!user && increment) {
        console.log(
          "[Chat Interface] Incrementing rate limit for anonymous user"
        );
        try {
          const result = await increment();
          console.log("[Chat Interface] Anonymous increment result:", result);
        } catch (error) {
          console.error(
            "[Chat Interface] Failed to increment anonymous rate limit:",
            error
          );
          // Continue with message sending even if increment fails
        }
      }

      // Send message with sessionId available for usage tracking
      sendMessage({ text: queryText });

      if (libraryContextItems.length > 0) {
        setLibraryContextItems([]);
        setLibraryContextExpanded(false);
      }

      // For authenticated users, trigger optimistic rate limit update
      if (user) {
        console.log("[Chat Interface] Triggering optimistic rate limit update");
        rateLimitMutation.mutate();
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setInput(newValue);

    // Debounce URL updates to avoid excessive history changes
    if (newValue.trim()) {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
      urlUpdateTimeoutRef.current = setTimeout(() => {
        updateUrlWithQuery(newValue);
      }, 500);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter((message) => message.id !== messageId));
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message && message.parts[0]?.type === "text") {
      setEditingMessageId(messageId);
      setEditingText(message.parts[0].text);
    }
  };

  const handleSaveEdit = (messageId: string) => {
    setMessages(
      messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              parts: [{ type: "text" as const, text: editingText }],
            }
          : message
      )
    );
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const toggleToolExpansion = (toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const toggleChartExpansion = (toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      const collapsedKey = `collapsed-${toolId}`;
      if (newSet.has(collapsedKey)) {
        newSet.delete(collapsedKey);
      } else {
        newSet.add(collapsedKey);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const updateUrlWithQuery = (query: string) => {
    if (query.trim()) {
      const url = new URL(window.location.href);
      url.searchParams.set("q", query);
      // Preserve chatId if it exists
      if (sessionIdRef.current) {
        url.searchParams.set("chatId", sessionIdRef.current);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const setInputAndUpdateUrl = (query: string) => {
    setInput(query);
    updateUrlWithQuery(query);
  };

  const handlePromptClick = (query: string) => {
    // Clear input first for animation effect
    setInput("");
    updateUrlWithQuery(query);
    setIsStartingNewChat(false); // Reset flag since we're setting new content

    // Animate text appearing character by character
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= query.length) {
        setInput(query.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 4); // Adjust speed here (lower = faster)
  };

  const getMessageText = (message: HealthcareUIMessage) => {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  };

  // Removed startNewChat function - using parent's handleNewChat via URL management

  const isLoading = status === "submitted" || status === "streaming";
  const canStop = status === "submitted" || status === "streaming";
  const canRegenerate =
    (status === "ready" || status === "error") && messages.length > 0;

  return (
    <>
      <SavedResultsProvider>
        <SeenResultsProvider sessionKey={sessionIdRef.current}>
          <div className="w-full max-w-3xl mx-auto relative min-h-0">
            {/* Removed duplicate New Chat button - handled by parent page */}
            {process.env.NEXT_PUBLIC_APP_MODE === "development" && (
              <div className="fixed top-4 left-4 z-50">
                <OllamaStatusIndicator hasMessages={messages.length > 0} />
              </div>
            )}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className={`space-y-4 sm:space-y-8 min-h-[300px] overflow-y-auto overflow-x-hidden ${
                messages.length > 0 ? "pt-20 sm:pt-24" : "pt-2 sm:pt-4"
              } ${isFormAtBottom ? "pb-32 sm:pb-36" : "pb-4 sm:pb-8"}`}
            >
              {messages.length === 0 && (
                <motion.div
                  className="pt-8 1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-center mb-6 sm:mb-8">
                    {/* Capabilities */}
                    <div className="max-w-4xl mx-auto">
                      {/* Fast Mode Toggle */}
                      <motion.button
                        onClick={() => setEffectiveFastMode(!effectiveFastMode)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium mb-2 transition-colors
                    ${
                      effectiveFastMode
                        ? "bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                        : "bg-green-50 dark:bg-green-800/50 border-green-200 dark:border-green-700 text-green-500 dark:text-green-400"
                    }
                    hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60
                  `}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.4 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ position: "absolute", left: 0, marginLeft: 0 }}
                        aria-pressed={effectiveFastMode}
                        type="button"
                      >
                        <span
                          className={`w-2 h-2 rounded-full mr-1 ${
                            effectiveFastMode
                              ? "bg-purple-500"
                              : "bg-green-400 dark:bg-green-600"
                          }`}
                        />

                        <span>
                          {effectiveFastMode ? "Fast Mode" : "Research Mode"}
                        </span>
                      </motion.button>
                      <motion.div
                        className="text-center mb-4 sm:mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                      >
                        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Try these capabilities
                        </h3>
                      </motion.div>

                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 px-2 sm:px-0">
                        <motion.button
                          onClick={() =>
                            handlePromptClick(
                              "Find all active Phase 3 clinical trials for metastatic melanoma. Focus on immunotherapy trials, show enrollment numbers, primary endpoints, and compare efficacy data. Create a visualization comparing response rates across different checkpoint inhibitors."
                            )
                          }
                          className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                            🧬 Clinical Trials
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            Active trials & efficacy data
                          </div>
                        </motion.button>

                        <motion.button
                          onClick={() =>
                            handlePromptClick(
                              "Compare warfarin vs. apixaban for atrial fibrillation. Look up FDA labels for contraindications, drug interactions, and bleeding risks. Search recent literature on real-world effectiveness data and create a comprehensive safety comparison table."
                            )
                          }
                          className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, duration: 0.5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                            💊 Drug Labels
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            FDA labels & safety comparisons
                          </div>
                        </motion.button>

                        <motion.button
                          onClick={() =>
                            handlePromptClick(
                              "Search PubMed for the latest CAR-T cell therapy advances in treating B-cell lymphomas. Focus on papers from 2023-2024, summarize response rates, toxicity profiles, and compare different CAR-T products. Include real-world evidence studies."
                            )
                          }
                          className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                            📚 PubMed Search
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            Biomedical literature & research papers
                          </div>
                        </motion.button>

                        <motion.button
                          onClick={() =>
                            handlePromptClick(
                              "Analyze Moderna's competitive position in the mRNA therapeutics market. Review their latest SEC filings, drug pipeline, ongoing clinical trials, and stock performance. Compare with BioNTech and CureVac. Include patent landscape analysis."
                            )
                          }
                          className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                            💼 Pharma Analysis
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            Company pipelines & competitive intelligence
                          </div>
                        </motion.button>

                        <motion.button
                          onClick={() =>
                            handlePromptClick(
                              "Use Python to perform a survival analysis on breast cancer clinical trial data. Calculate progression-free survival rates, create Kaplan-Meier curves comparing different treatment arms, and identify statistically significant predictors of treatment response."
                            )
                          }
                          className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                            🐍 Biostatistics
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            Clinical data analysis & survival curves
                          </div>
                        </motion.button>

                        <motion.button
                          onClick={() =>
                            handlePromptClick(
                              "Comprehensive analysis of the COVID-19 vaccine race: Compare Pfizer, Moderna, and AstraZeneca's vaccine development timelines, clinical trial results, efficacy data, safety profiles, and market impact. Include SEC filings, stock performance during vaccine announcements, and revenue from vaccine sales. Create visualizations comparing their Phase 3 trial results."
                            )
                          }
                          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-2.5 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 text-left group col-span-1 sm:col-span-2 lg:col-span-1"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8, duration: 0.5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-blue-700 dark:text-blue-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-blue-900 dark:group-hover:text-blue-100">
                            🧬 Vaccine Analysis
                          </div>
                          <div className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">
                            Multi-company trials + Efficacy data + Market impact
                          </div>
                        </motion.button>
                      </div>

                      <div className="mt-4 sm:mt-8">
                        <DataSourceLogos />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Input Form when not at bottom (desktop only) */}
              {!isFormAtBottom && messages.length === 0 && !isMobile && (
                <motion.div
                  className="mt-8 mb-16"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                >
                  <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
                    <form
                      onSubmit={handleSubmit}
                      className="max-w-3xl mx-auto space-y-2"
                    >
                      {showFileDropzone && (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-sm text-gray-800 dark:text-gray-200">
                                Attach files &amp; media
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Drop files below or click to browse. We&apos;ll
                                add them to the next answer.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={closeFileDropzone}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-3">
                            <Dropzone
                              maxFiles={5}
                              accept={{
                                "application/pdf": [".pdf"],
                                "image/*": [
                                  ".png",
                                  ".jpg",
                                  ".jpeg",
                                  ".gif",
                                  ".bmp",
                                  ".webp",
                                ],
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                                  [".docx"],
                                "application/json": [".json"],
                              }}
                              onDrop={handleFileDrop}
                              onError={(error) => console.error(error)}
                              src={dropzoneFiles}
                              className="w-full border-2 border-dashed border-gray-300 bg-transparent px-4 py-6 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
                            >
                              <DropzoneEmptyState />
                              <DropzoneContent />
                            </Dropzone>
                          </div>
                        </div>
                      )}
                      {Object.keys(uploadingFiles).length > 0 && (
                        <div className="space-y-2">
                          {Object.entries(uploadingFiles).map(
                            ([fileId, fileUpload]) => (
                              <div
                                key={fileId}
                                className="rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-blue-800 shadow-sm dark:border-blue-800/70 dark:bg-blue-900/20 dark:text-blue-200"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400"></div>
                                    <span className="text-xs font-medium">
                                      Uploading and processing:{" "}
                                      {fileUpload.fileName}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => cancelFileUpload(fileId)}
                                    className="flex h-5 w-5 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-800/30"
                                    title="Cancel upload"
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      {libraryContextBanner}
                      <div className="relative flex items-end">
                        <DropdownMenu
                          open={inputMenuOpen}
                          onOpenChange={setInputMenuOpen}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-transparent hover:bg-gray-200/60 dark:hover:bg-gray-800/80 text-gray-500 dark:text-gray-300"
                              tabIndex={-1}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            sideOffset={6}
                            className="w-40 text-xs"
                          >
                            <DropdownMenuItem onSelect={handleFileMenuSelect}>
                              <span className="inline-flex items-center">
                                <FileText className="h-4 w-4 mr-1" />
                                Files &amp; media
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                if (user) {
                                  openLibraryCard();
                                } else {
                                  setShowAuthModal(true);
                                }
                              }}
                            >
                              <span className="inline-flex items-center">
                                <Library className="h-4 w-4 mr-1" />
                                Library
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Textarea
                          value={input}
                          onChange={handleInputChange}
                          placeholder="Ask a question..."
                          className="w-full resize-none border-gray-200 dark:border-gray-700 rounded-2xl pl-10 sm:pl-12 pr-14 sm:pr-16 py-2.5 sm:py-3 min-h-[38px] sm:min-h-[40px] max-h-28 sm:max-h-32 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-0 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto text-sm sm:text-base"
                          disabled={status === "error" || isLoading}
                          rows={1}
                          style={{ lineHeight: "1.5" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}
                        />
                        <Button
                          type={canStop ? "button" : "submit"}
                          onClick={canStop ? stop : undefined}
                          disabled={
                            !canStop &&
                            (isLoading || !input.trim() || status === "error")
                          }
                          className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 rounded-xl h-7 w-7 sm:h-8 sm:w-8 p-0 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
                        >
                          {canStop ? (
                            <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          ) : isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                          ) : (
                            <svg
                              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 12l14 0m-7-7l7 7-7 7"
                              />
                            </svg>
                          )}
                        </Button>
                      </div>
                    </form>

                    {/* Powered by Valyu */}
                    <motion.div
                      className="flex items-center justify-center mt-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.1, duration: 0.5 }}
                    >
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Powered by
                      </span>
                      <a
                        href="https://platform.valyu.network"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center hover:scale-105 transition-transform"
                      >
                        <Image
                          src="/valyu.svg"
                          alt="Valyu"
                          width={60}
                          height={60}
                          className="h-4 opacity-60 hover:opacity-100 transition-opacity cursor-pointer dark:invert"
                        />
                      </a>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={!virtualizationEnabled}>
                {(virtualizationEnabled
                  ? deferredMessages
                      .slice(visibleRange.start, visibleRange.end)
                      .map((message, i) => ({
                        item: message,
                        realIndex: visibleRange.start + i,
                      }))
                  : deferredMessages.map((m, i) => ({ item: m, realIndex: i }))
                ).map(({ item: message }) => {
                  const contextResources = contextResourceMap[message.id] || [];

                  return (
                    <motion.div
                      key={message.id}
                      data-message-id={message.id}
                      className="group"
                      initial={
                        virtualizationEnabled
                          ? undefined
                          : { opacity: 0, y: 20 }
                      }
                      animate={
                        virtualizationEnabled ? undefined : { opacity: 1, y: 0 }
                      }
                      exit={
                        virtualizationEnabled
                          ? undefined
                          : { opacity: 0, y: -20 }
                      }
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      {message.role === "user" ? (
                        <>
                          <div className="flex justify-end mb-3 px-3 sm:px-0">
                            <div className="max-w-[85%] sm:max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 sm:px-4 py-3 sm:py-3 relative group shadow-sm">
                              {/* User Message Actions */}
                              <div className="absolute -left-12 sm:-left-14 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMessage(message.id)}
                                  className="h-6 w-6 p-0 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-700"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    // Extract text content from the message
                                    let textContent = "";
                                    if (
                                      message.parts &&
                                      Array.isArray(message.parts)
                                    ) {
                                      const textPart = message.parts.find(
                                        (p) => p.type === "text"
                                      );
                                      if (textPart && textPart.text) {
                                        textContent = textPart.text;
                                      }
                                    } else if (
                                      typeof message.parts === "string"
                                    ) {
                                      textContent = message.parts;
                                    }

                                    if (textContent) {
                                      await copyToClipboard(textContent);
                                      // Show "copied" notification
                                      setCopiedMessageId(message.id);
                                      // Hide notification after 2 seconds
                                      setTimeout(() => {
                                        setCopiedMessageId(null);
                                      }, 2000);
                                    }
                                  }}
                                  className="h-6 w-6 p-0 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 relative"
                                  title={
                                    copiedMessageId === message.id
                                      ? "Copied!"
                                      : "Copy message"
                                  }
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteMessage(message.id)
                                  }
                                  className="h-6 w-6 p-0 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              {editingMessageId === message.id ? (
                                <div className="space-y-3">
                                  <div className="relative">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="absolute left-2 top-2.5 h-8 w-8 rounded-xl bg-transparent hover:bg-gray-200/60 dark:hover:bg-gray-800/80 text-gray-500 dark:text-gray-300 shadow-none"
                                          tabIndex={-1}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="start"
                                        sideOffset={6}
                                        className="w-32 text-xs"
                                      >
                                        <DropdownMenuItem
                                          onSelect={() => {
                                            openLibraryCard();
                                          }}
                                        >
                                          <span className="inline-flex items-center">
                                            <Library className="h-4 w-4 mr-1" />
                                            Library
                                          </span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Textarea
                                      value={editingText}
                                      onChange={(e) =>
                                        setEditingText(e.target.value)
                                      }
                                      className="min-h-[80px] border-gray-200 dark:border-gray-600 rounded-xl pl-12"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleSaveEdit(message.id)}
                                      size="sm"
                                      disabled={!editingText.trim()}
                                      className="rounded-full"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      onClick={handleCancelEdit}
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-900 dark:text-gray-100">
                                  {(() => {
                                    // If there are context resources (uploaded files), don't show the raw text
                                    // The uploaded files will be displayed as result cards below
                                    if (contextResources.length > 0) {
                                      // Extract just the user's actual prompt text, excluding context instructions
                                      if (
                                        message.parts &&
                                        Array.isArray(message.parts)
                                      ) {
                                        const textPart = message.parts.find(
                                          (p) => p.type === "text"
                                        );
                                        if (textPart && textPart.text) {
                                          const text = textPart.text;

                                          // Look for the [USER PROMPT] marker to extract the original prompt
                                          const userPromptMatch = text.match(
                                            /\[USER PROMPT\]\s*\n([\s\S]+)$/
                                          );
                                          if (userPromptMatch) {
                                            return userPromptMatch[1].trim();
                                          }

                                          // Fallback: if no [USER PROMPT] marker, try to extract before context blocks
                                          const beforeContext = text
                                            .split(/Context \[/)[0]
                                            .trim();
                                          if (
                                            beforeContext &&
                                            !beforeContext.includes(
                                              "You must ground your answer"
                                            )
                                          ) {
                                            return beforeContext;
                                          }

                                          return "Files uploaded";
                                        }
                                      }
                                      return "Files uploaded";
                                    }

                                    // Handle different message content formats when no context resources
                                    if (
                                      message.parts &&
                                      Array.isArray(message.parts)
                                    ) {
                                      const textPart = message.parts.find(
                                        (p) => p.type === "text"
                                      );
                                      if (textPart && textPart.text) {
                                        return textPart.text;
                                      }
                                    }

                                    // Fallback: if parts is not properly formatted, try to extract text
                                    if (typeof message.parts === "string") {
                                      return message.parts;
                                    }

                                    // Last resort: return a default message
                                    return "Message content not available";
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>

                          {contextResources.length > 0 ? (
                            <div className="mb-4 sm:mb-6 px-3 sm:px-0">
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="font-medium">
                                      Input Context
                                    </span>
                                    <span className="text-xs text-blue-600 dark:text-blue-300">
                                      ({contextResources.length} resources)
                                    </span>
                                  </div>
                                </div>
                                <SearchResultsCarousel
                                  results={contextResources.map(
                                    formatSavedItemForCard
                                  )}
                                  type="web"
                                  messageId={message.id}
                                  toolName="queued-context"
                                />
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        /* Assistant Message */
                        <div className="mb-4 sm:mb-6 group px-3 sm:px-0">
                          {editingMessageId === message.id ? null : (
                            <div className="space-y-4">
                              {(() => {
                                // Group consecutive reasoning steps together
                                const groupedParts: any[] = [];
                                let currentReasoningGroup: any[] = [];

                                message.parts.forEach((part, index) => {
                                  if (
                                    part.type === "reasoning" &&
                                    part.text &&
                                    part.text.trim() !== ""
                                  ) {
                                    currentReasoningGroup.push({ part, index });
                                  } else {
                                    if (currentReasoningGroup.length > 0) {
                                      groupedParts.push({
                                        type: "reasoning-group",
                                        parts: currentReasoningGroup,
                                      });
                                      currentReasoningGroup = [];
                                    }
                                    groupedParts.push({
                                      type: "single",
                                      part,
                                      index,
                                    });
                                  }
                                });

                                // Add any remaining reasoning group
                                if (currentReasoningGroup.length > 0) {
                                  groupedParts.push({
                                    type: "reasoning-group",
                                    parts: currentReasoningGroup,
                                  });
                                }

                                return groupedParts.map((group, groupIndex) => {
                                  if (group.type === "reasoning-group") {
                                    // Render combined reasoning component
                                    const combinedText = group.parts
                                      .map((item: any) => item.part.text)
                                      .join("\n\n");
                                    const firstPart = group.parts[0].part;
                                    const isStreaming = group.parts.some(
                                      (item: any) =>
                                        item.part.state === "streaming" ||
                                        status === "streaming"
                                    );

                                    return (
                                      <ReasoningComponent
                                        key={`reasoning-group-${groupIndex}`}
                                        part={{
                                          ...firstPart,
                                          text: combinedText,
                                        }}
                                        messageId={message.id}
                                        index={groupIndex}
                                        status={
                                          isStreaming ? "streaming" : status
                                        }
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={
                                          toggleToolExpansion
                                        }
                                      />
                                    );
                                  } else {
                                    // Render single part normally
                                    const { part, index } = group;

                                    switch (part.type) {
                                      // Text parts
                                      case "text":
                                        return (
                                          <div
                                            key={index}
                                            className="prose prose-sm max-w-none dark:prose-invert"
                                          >
                                            {(() => {
                                              // Collect citations from tool results that appear BEFORE this text part
                                              const citations: CitationMap = {};
                                              let citationNumber = 1;

                                              // Find the current part's index
                                              const currentPartIndex =
                                                message.parts.findIndex(
                                                  (p: any) => p === part
                                                );

                                              // Look for tool results that come BEFORE this text part
                                              // This ensures citations match the order the AI references them
                                              for (
                                                let i = 0;
                                                i < currentPartIndex;
                                                i++
                                              ) {
                                                const p = message.parts[i];

                                                // Check for search tool results (financial, web, wiley, and healthcare tools)
                                                if (
                                                  (p.type ===
                                                    "tool-financialSearch" ||
                                                    p.type ===
                                                      "tool-webSearch" ||
                                                    p.type ===
                                                      "tool-wileySearch" ||
                                                    p.type ===
                                                      "tool-clinicalTrialsSearch" ||
                                                    p.type ===
                                                      "tool-getClinicalTrialDetails" ||
                                                    p.type ===
                                                      "tool-drugInformationSearch" ||
                                                    p.type ===
                                                      "tool-biomedicalLiteratureSearch" ||
                                                    p.type ===
                                                      "tool-pharmaCompanyAnalysis" ||
                                                    p.type ===
                                                      "tool-comprehensiveHealthcareSearch") &&
                                                  p.state ===
                                                    "output-available" &&
                                                  p.output
                                                ) {
                                                  try {
                                                    const output =
                                                      typeof p.output ===
                                                      "string"
                                                        ? JSON.parse(p.output)
                                                        : (p as any).output; // lol sorry

                                                    // Check if this is a search result with multiple items
                                                    if (
                                                      output.results &&
                                                      Array.isArray(
                                                        output.results
                                                      )
                                                    ) {
                                                      output.results.forEach(
                                                        (item: any) => {
                                                          const key = `[${citationNumber}]`;
                                                          // Ensure description is a string, not an object
                                                          let description =
                                                            item.content ||
                                                            item.summary ||
                                                            item.description ||
                                                            "";
                                                          if (
                                                            typeof description ===
                                                            "object"
                                                          ) {
                                                            description =
                                                              JSON.stringify(
                                                                description
                                                              );
                                                          }
                                                          citations[key] = [
                                                            {
                                                              number:
                                                                citationNumber.toString(),
                                                              title:
                                                                item.title ||
                                                                `Source ${citationNumber}`,
                                                              url:
                                                                item.url || "",
                                                              description:
                                                                description,
                                                              source:
                                                                item.source,
                                                              date: item.date,
                                                              authors:
                                                                Array.isArray(
                                                                  item.authors
                                                                )
                                                                  ? item.authors
                                                                  : [],
                                                              doi: item.doi,
                                                              relevanceScore:
                                                                item.relevanceScore ||
                                                                item.relevance_score,
                                                              toolType:
                                                                p.type ===
                                                                "tool-financialSearch"
                                                                  ? "financial"
                                                                  : p.type ===
                                                                    "tool-wileySearch"
                                                                  ? "wiley"
                                                                  : p.type ===
                                                                    "tool-clinicalTrialsSearch"
                                                                  ? "clinical-trials"
                                                                  : p.type ===
                                                                    "tool-getClinicalTrialDetails"
                                                                  ? "clinical-trials"
                                                                  : p.type ===
                                                                    "tool-drugInformationSearch"
                                                                  ? "drug-info"
                                                                  : p.type ===
                                                                    "tool-biomedicalLiteratureSearch"
                                                                  ? "biomedical"
                                                                  : p.type ===
                                                                    "tool-pharmaCompanyAnalysis"
                                                                  ? "pharma"
                                                                  : p.type ===
                                                                    "tool-comprehensiveHealthcareSearch"
                                                                  ? "healthcare"
                                                                  : "web",
                                                            },
                                                          ];
                                                          citationNumber++;

                                                          // Log each citation as it's added
                                                          console.log(
                                                            `[Citations] Added citation [${
                                                              citationNumber - 1
                                                            }]:`,
                                                            item.title ||
                                                              "Untitled"
                                                          );
                                                        }
                                                      );
                                                    }
                                                  } catch (error) {
                                                    console.error(
                                                      "Error extracting citations from tool:",
                                                      p.type,
                                                      error
                                                    );
                                                  }
                                                }
                                              }

                                              // Debug: Log citations collected
                                              if (
                                                Object.keys(citations).length >
                                                0
                                              ) {
                                                console.log(
                                                  "[Citations] Total citations collected for text part:",
                                                  Object.keys(citations).length,
                                                  citations
                                                );
                                              }

                                              // If we have citations, use the citation renderer, otherwise use regular markdown
                                              if (
                                                Object.keys(citations).length >
                                                0
                                              ) {
                                                return (
                                                  <CitationTextRenderer
                                                    text={part.text}
                                                    citations={citations}
                                                  />
                                                );
                                              } else {
                                                return (
                                                  <MemoizedMarkdown
                                                    text={part.text}
                                                  />
                                                );
                                              }
                                            })()}
                                          </div>
                                        );

                                      // Skip individual reasoning parts as they're handled in groups
                                      case "reasoning":
                                        return null;

                                      // Python Executor Tool
                                      case "tool-codeExecution": {
                                        const callId = part.toolCallId;
                                        const isExpanded =
                                          expandedTools.has(callId);

                                        switch (part.state) {
                                          case "input-streaming":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                                                  <span className="text-lg">
                                                    🐍
                                                  </span>
                                                  <span className="font-medium">
                                                    Python Executor
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-blue-600 dark:text-blue-300">
                                                  Preparing code execution...
                                                </div>
                                              </div>
                                            );
                                          case "input-available":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                                                  <span className="text-lg">
                                                    🐍
                                                  </span>
                                                  <span className="font-medium">
                                                    Python Executor
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-blue-600 dark:text-blue-300">
                                                  <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">
                                                    <div className="flex items-center justify-between mb-2">
                                                      <span className="font-medium">
                                                        {part.input
                                                          .description ||
                                                          "Executing Python code..."}
                                                      </span>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                          toggleToolExpansion(
                                                            callId
                                                          )
                                                        }
                                                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                                      >
                                                        {isExpanded ? (
                                                          <ChevronUp className="h-3 w-3" />
                                                        ) : (
                                                          <ChevronDown className="h-3 w-3" />
                                                        )}
                                                      </Button>
                                                    </div>
                                                    {isExpanded ? (
                                                      <pre className="font-mono text-xs whitespace-pre-wrap bg-white dark:bg-gray-800 p-2 rounded border max-h-48 overflow-y-auto">
                                                        {part.input.code}
                                                      </pre>
                                                    ) : (
                                                      <div className="font-mono text-xs text-blue-700 dark:text-blue-300 line-clamp-2">
                                                        {
                                                          part.input.code.split(
                                                            "\n"
                                                          )[0]
                                                        }
                                                        ...
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          case "output-available":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                                                  <CheckCircle className="h-4 w-4" />
                                                  <span className="font-medium">
                                                    Python Execution Result
                                                  </span>
                                                </div>
                                                <div className="text-sm text-green-600 dark:text-green-300">
                                                  <div className="prose prose-sm max-w-none dark:prose-invert">
                                                    <MemoizedMarkdown
                                                      text={part.output}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          case "output-error":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                                  <AlertCircle className="h-4 w-4" />
                                                  <span className="font-medium">
                                                    Python Execution Error
                                                  </span>
                                                </div>
                                                <div className="text-sm text-red-600 dark:text-red-300">
                                                  {part.errorText}
                                                </div>
                                              </div>
                                            );
                                        }
                                        break;
                                      }

                                      // Financial Search Tool
                                      case "tool-financialSearch": {
                                        const callId = part.toolCallId;
                                        switch (part.state) {
                                          case "input-streaming":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                                                  <span className="text-lg">
                                                    🔍
                                                  </span>
                                                  <span className="font-medium">
                                                    Financial Search
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-purple-600 dark:text-purple-300">
                                                  Preparing financial data
                                                  search...
                                                </div>
                                              </div>
                                            );
                                          case "input-available":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                                                  <span className="text-lg">
                                                    🔍
                                                  </span>
                                                  <span className="font-medium">
                                                    Financial Search
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-purple-600 dark:text-purple-300">
                                                  <div className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded">
                                                    <div className="font-mono text-xs">
                                                      Query: &quot;
                                                      {part.input.query}
                                                      &quot;
                                                      {part.input.dataType &&
                                                        part.input.dataType !==
                                                          "auto" && (
                                                          <>
                                                            <br />
                                                            Type:{" "}
                                                            {
                                                              part.input
                                                                .dataType
                                                            }
                                                          </>
                                                        )}
                                                      {part.input
                                                        .maxResults && (
                                                        <>
                                                          <br />
                                                          Max Results:{" "}
                                                          {
                                                            part.input
                                                              .maxResults
                                                          }
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="mt-2 text-xs">
                                                    Searching financial
                                                    databases and news
                                                    sources...
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          case "output-available":
                                            const financialResults =
                                              extractSearchResults(part.output);
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4"
                                              >
                                                <div className="flex items-center justify-between gap-3 mb-4">
                                                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="font-medium">
                                                      Financial Search Results
                                                    </span>
                                                    <span className="text-xs text-green-600 dark:text-green-300">
                                                      ({financialResults.length}{" "}
                                                      results)
                                                    </span>
                                                  </div>
                                                  {part.input?.query && (
                                                    <div
                                                      className="text-xs font-mono text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded border border-green-200 dark:border-green-700 max-w-[60%] truncate"
                                                      title={part.input.query}
                                                    >
                                                      {part.input.query}
                                                    </div>
                                                  )}
                                                </div>
                                                <SearchResultsCarousel
                                                  results={financialResults}
                                                  type="financial"
                                                  toolName="financialSearch"
                                                  messageId={message.id}
                                                />
                                              </div>
                                            );
                                          case "output-error":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                                  <AlertCircle className="h-4 w-4" />
                                                  <span className="font-medium">
                                                    Financial Search Error
                                                  </span>
                                                </div>
                                                <div className="text-sm text-red-600 dark:text-red-300">
                                                  {part.errorText}
                                                </div>
                                              </div>
                                            );
                                        }
                                        break;
                                      }

                                      // Web Search Tool
                                      case "tool-webSearch": {
                                        const callId = part.toolCallId;
                                        switch (part.state) {
                                          case "input-streaming":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 mb-2">
                                                  <span className="text-lg">
                                                    🌐
                                                  </span>
                                                  <span className="font-medium">
                                                    Web Search
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-cyan-600 dark:text-cyan-300">
                                                  Preparing web search...
                                                </div>
                                              </div>
                                            );
                                          case "input-available":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 mb-2">
                                                  <span className="text-lg">
                                                    🌐
                                                  </span>
                                                  <span className="font-medium">
                                                    Web Search
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-cyan-600 dark:text-cyan-300">
                                                  <div className="bg-cyan-100 dark:bg-cyan-800/30 p-2 rounded">
                                                    <div className="text-xs">
                                                      Searching for: &quot;
                                                      {part.input.query}&quot;
                                                    </div>
                                                  </div>
                                                  <div className="mt-2 text-xs">
                                                    Searching the world wide
                                                    web...
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          case "output-available":
                                            const webResults =
                                              extractSearchResults(part.output);
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4"
                                              >
                                                <div className="flex items-center justify-between gap-3 mb-4">
                                                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="font-medium">
                                                      Web Search Results
                                                    </span>
                                                    <span className="text-xs text-blue-600 dark:text-blue-300">
                                                      ({webResults.length}{" "}
                                                      results)
                                                    </span>
                                                  </div>
                                                  {part.input?.query && (
                                                    <div
                                                      className="text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded border border-blue-200 dark:border-blue-700 max-w-[60%] truncate"
                                                      title={part.input.query}
                                                    >
                                                      {part.input.query}
                                                    </div>
                                                  )}
                                                </div>
                                                <SearchResultsCarousel
                                                  results={webResults}
                                                  type="web"
                                                  toolName="webSearch"
                                                  messageId={message.id}
                                                />
                                              </div>
                                            );
                                          case "output-error":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                                  <AlertCircle className="h-4 w-4" />
                                                  <span className="font-medium">
                                                    Web Search Error
                                                  </span>
                                                </div>
                                                <div className="text-sm text-red-600 dark:text-red-300">
                                                  {part.errorText}
                                                </div>
                                              </div>
                                            );
                                        }
                                        break;
                                      }

                                      // Wiley Search Tool
                                      case "tool-wileySearch": {
                                        const callId = part.toolCallId;
                                        switch (part.state) {
                                          case "input-streaming":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                                                  <span className="text-lg">
                                                    📚
                                                  </span>
                                                  <span className="font-medium">
                                                    Wiley Academic Search
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-amber-600 dark:text-amber-300">
                                                  Searching academic journals
                                                  and textbooks...
                                                </div>
                                              </div>
                                            );
                                          case "input-available":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                                                  <span className="text-lg">
                                                    📚
                                                  </span>
                                                  <span className="font-medium">
                                                    Wiley Academic Search
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-amber-600 dark:text-amber-300">
                                                  <div className="font-medium">
                                                    Searching for: &quot;
                                                    {part.input.query}&quot;
                                                  </div>
                                                </div>
                                                <div className="mt-2 text-xs">
                                                  Searching academic finance
                                                  literature...
                                                </div>
                                              </div>
                                            );
                                          case "output-available":
                                            const wileyResults =
                                              extractSearchResults(part.output);
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4"
                                              >
                                                <div className="flex items-center justify-between gap-3 mb-4">
                                                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="font-medium">
                                                      Wiley Academic Results
                                                    </span>
                                                    <span className="text-xs text-amber-600 dark:text-amber-300">
                                                      ({wileyResults.length}{" "}
                                                      results)
                                                    </span>
                                                  </div>
                                                  {part.input?.query && (
                                                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-800/30 px-2 py-1 rounded">
                                                      &quot;{part.input.query}
                                                      &quot;
                                                    </div>
                                                  )}
                                                </div>
                                                <SearchResultsCarousel
                                                  results={wileyResults}
                                                  type="wiley"
                                                  toolName="wileySearch"
                                                  messageId={message.id}
                                                />
                                              </div>
                                            );
                                          case "output-error":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                                  <AlertCircle className="h-4 w-4" />
                                                  <span className="font-medium">
                                                    Wiley Search Error
                                                  </span>
                                                </div>
                                                <div className="text-sm text-red-600 dark:text-red-300">
                                                  {part.errorText}
                                                </div>
                                              </div>
                                            );
                                        }
                                        break;
                                      }

                                      // Chart Creation Tool
                                      case "tool-createChart": {
                                        const callId = part.toolCallId;
                                        switch (part.state) {
                                          case "input-streaming":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                                                  <span className="text-lg">
                                                    📈
                                                  </span>
                                                  <span className="font-medium">
                                                    Creating Chart
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-emerald-600 dark:text-emerald-300">
                                                  Preparing chart
                                                  visualization...
                                                </div>
                                              </div>
                                            );
                                          case "input-available":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                                                  <span className="text-lg">
                                                    📈
                                                  </span>
                                                  <span className="font-medium">
                                                    Creating Chart
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-emerald-600 dark:text-emerald-300">
                                                  <div className="bg-emerald-100 dark:bg-emerald-800/30 p-2 rounded">
                                                    <div className="font-mono text-xs">
                                                      Creating {part.input.type}{" "}
                                                      chart: &quot;
                                                      {part.input.title}
                                                      &quot;
                                                      <br />
                                                      Data Series:{" "}
                                                      {part.input.dataSeries
                                                        ?.length || 0}
                                                    </div>
                                                  </div>
                                                  <div className="mt-2 text-xs">
                                                    Generating interactive
                                                    visualization...
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          case "output-available":
                                            // Charts are expanded by default, collapsed only if explicitly set
                                            const isChartExpanded =
                                              !expandedTools.has(
                                                `collapsed-${callId}`
                                              );
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2"
                                              >
                                                {isChartExpanded ? (
                                                  <div className="relative">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() =>
                                                        toggleChartExpansion(
                                                          callId
                                                        )
                                                      }
                                                      className="absolute right-2 top-2 z-10 h-6 w-6 p-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-sm"
                                                    >
                                                      <ChevronUp className="h-4 w-4" />
                                                    </Button>
                                                    <FinancialChart
                                                      {...part.output}
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                        <span className="text-lg">
                                                          📈
                                                        </span>
                                                        <span className="font-medium">
                                                          {part.output.title}
                                                        </span>
                                                      </div>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                          toggleChartExpansion(
                                                            callId
                                                          )
                                                        }
                                                        className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                                      >
                                                        <ChevronDown className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                                      <div>
                                                        Chart Type:{" "}
                                                        {part.output.chartType}
                                                      </div>
                                                      <div>
                                                        Data Series:{" "}
                                                        {part.output.dataSeries
                                                          ?.length || 0}
                                                      </div>
                                                      {part.output
                                                        .description && (
                                                        <div className="text-xs">
                                                          {
                                                            part.output
                                                              .description
                                                          }
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="text-center mt-3">
                                                      <button
                                                        onClick={() =>
                                                          toggleChartExpansion(
                                                            callId
                                                          )
                                                        }
                                                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                                                      >
                                                        View Chart
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          case "output-error":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                                  <AlertCircle className="h-4 w-4" />
                                                  <span className="font-medium">
                                                    Chart Creation Error
                                                  </span>
                                                </div>
                                                <div className="text-sm text-red-600 dark:text-red-300">
                                                  {part.errorText}
                                                </div>
                                              </div>
                                            );
                                        }
                                        break;
                                      }

                                      // Clinical Trials Search Tool
                                      case "tool-clinicalTrialsSearch":
                                      // Get Clinical Trial Details Tool
                                      case "tool-getClinicalTrialDetails":
                                      // Drug Information Search Tool
                                      case "tool-drugInformationSearch":
                                      // Biomedical Literature Search Tool
                                      case "tool-biomedicalLiteratureSearch":
                                      // Pharma Company Analysis Tool
                                      case "tool-pharmaCompanyAnalysis":
                                      // Comprehensive Healthcare Search Tool
                                      case "tool-comprehensiveHealthcareSearch": {
                                        const callId = part.toolCallId;
                                        switch (part.state) {
                                          case "input-streaming":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                                                  <span className="text-lg">
                                                    🧬
                                                  </span>
                                                  <span className="font-medium">
                                                    {part.type ===
                                                      "tool-clinicalTrialsSearch" &&
                                                      "Searching Clinical Trials"}
                                                    {part.type ===
                                                      "tool-getClinicalTrialDetails" &&
                                                      "Fetching Clinical Trial Details"}
                                                    {part.type ===
                                                      "tool-drugInformationSearch" &&
                                                      "Searching Drug Information"}
                                                    {part.type ===
                                                      "tool-biomedicalLiteratureSearch" &&
                                                      "Searching Biomedical Literature"}
                                                    {part.type ===
                                                      "tool-pharmaCompanyAnalysis" &&
                                                      "Analyzing Pharmaceutical Company"}
                                                    {part.type ===
                                                      "tool-comprehensiveHealthcareSearch" &&
                                                      "Comprehensive Healthcare Search"}
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-indigo-600 dark:text-indigo-300">
                                                  Searching healthcare
                                                  databases...
                                                </div>
                                              </div>
                                            );
                                          case "input-available":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                                                  <span className="text-lg">
                                                    🧬
                                                  </span>
                                                  <span className="font-medium">
                                                    {part.type ===
                                                      "tool-clinicalTrialsSearch" &&
                                                      "Searching Clinical Trials"}
                                                    {part.type ===
                                                      "tool-getClinicalTrialDetails" &&
                                                      "Fetching Clinical Trial Details"}
                                                    {part.type ===
                                                      "tool-drugInformationSearch" &&
                                                      "Searching Drug Information"}
                                                    {part.type ===
                                                      "tool-biomedicalLiteratureSearch" &&
                                                      "Searching Biomedical Literature"}
                                                    {part.type ===
                                                      "tool-pharmaCompanyAnalysis" &&
                                                      "Analyzing Pharmaceutical Company"}
                                                    {part.type ===
                                                      "tool-comprehensiveHealthcareSearch" &&
                                                      "Comprehensive Healthcare Search"}
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-indigo-600 dark:text-indigo-300">
                                                  <div className="bg-indigo-100 dark:bg-indigo-800/30 p-2 rounded">
                                                    <div className="font-mono text-xs">
                                                      {part.type ===
                                                      "tool-getClinicalTrialDetails" ? (
                                                        <>
                                                          NCT ID:{" "}
                                                          {part.input.nctId ||
                                                            "N/A"}
                                                        </>
                                                      ) : (
                                                        <>
                                                          Query: &quot;
                                                          {part.input.query ||
                                                            "N/A"}
                                                          &quot;
                                                          {part.input
                                                            .maxResults && (
                                                            <>
                                                              <br />
                                                              Max Results:{" "}
                                                              {
                                                                part.input
                                                                  .maxResults
                                                              }
                                                            </>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="mt-2 text-xs">
                                                    Retrieving healthcare data
                                                    from specialized sources...
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          case "output-available":
                                            // Special handling for getClinicalTrialDetails
                                            if (
                                              part.type ===
                                              "tool-getClinicalTrialDetails"
                                            ) {
                                              try {
                                                const detailData = JSON.parse(
                                                  part.output
                                                );

                                                // Convert single trial detail to array format for display
                                                const detailResults =
                                                  detailData.found &&
                                                  detailData.data
                                                    ? [
                                                        {
                                                          id:
                                                            detailData.nctId ||
                                                            detailData.data
                                                              .nct_id,
                                                          title:
                                                            detailData.title ||
                                                            detailData.data
                                                              .brief_title ||
                                                            detailData.data
                                                              .official_title ||
                                                            "Clinical Trial",
                                                          summary:
                                                            detailData.data
                                                              .brief_summary ||
                                                            "No summary available",
                                                          source:
                                                            "ClinicalTrials.gov",
                                                          date:
                                                            detailData.data
                                                              .start_date || "",
                                                          url:
                                                            detailData.url ||
                                                            "",
                                                          fullContent:
                                                            JSON.stringify(
                                                              detailData.data
                                                            ),
                                                          dataType:
                                                            "clinical_trials",
                                                          nctId:
                                                            detailData.nctId ||
                                                            detailData.data
                                                              .nct_id,
                                                          status:
                                                            detailData.data
                                                              .overall_status,
                                                          phase:
                                                            detailData.data
                                                              .phases,
                                                          relevanceScore: 1,
                                                        },
                                                      ]
                                                    : [];

                                                return (
                                                  <div
                                                    key={callId}
                                                    className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 sm:p-4"
                                                  >
                                                    <div className="flex items-center justify-between gap-3 mb-4">
                                                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span className="font-medium">
                                                          Clinical Trial Details
                                                        </span>
                                                      </div>
                                                      {detailData.found && (
                                                        <span className="text-xs text-indigo-600 dark:text-indigo-400">
                                                          {detailData.nctId}
                                                        </span>
                                                      )}
                                                    </div>
                                                    {part.input?.query && (
                                                      <div className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-800/30 px-2 py-1 rounded mb-2">
                                                        &quot;{part.input.query}
                                                        &quot;
                                                      </div>
                                                    )}
                                                    {detailResults.length >
                                                    0 ? (
                                                      <SearchResultsCarousel
                                                        results={detailResults}
                                                        type="healthcare"
                                                        toolName="getClinicalTrialDetails"
                                                        messageId={message.id}
                                                      />
                                                    ) : (
                                                      <div className="text-sm text-gray-500">
                                                        {detailData.message ||
                                                          "No trial found"}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              } catch (e) {
                                                console.error(
                                                  "Failed to parse clinical trial details:",
                                                  e
                                                );
                                              }
                                            }

                                            // Regular handling for other healthcare tools
                                            const healthcareResults =
                                              extractSearchResults(part.output);
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 sm:p-4"
                                              >
                                                <div className="flex items-center justify-between gap-3 mb-4">
                                                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="font-medium">
                                                      {part.type ===
                                                        "tool-clinicalTrialsSearch" &&
                                                        "Clinical Trials Results"}
                                                      {part.type ===
                                                        "tool-drugInformationSearch" &&
                                                        "Drug Information Results"}
                                                      {part.type ===
                                                        "tool-biomedicalLiteratureSearch" &&
                                                        "Biomedical Literature Results"}
                                                      {part.type ===
                                                        "tool-pharmaCompanyAnalysis" &&
                                                        "Pharmaceutical Analysis Results"}
                                                      {part.type ===
                                                        "tool-comprehensiveHealthcareSearch" &&
                                                        "Healthcare Search Results"}
                                                    </span>
                                                  </div>
                                                  {healthcareResults.length >
                                                    0 && (
                                                    <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                                                      <span>
                                                        {
                                                          healthcareResults.length
                                                        }{" "}
                                                        results
                                                      </span>
                                                      {healthcareResults.some(
                                                        (r: any) =>
                                                          r.dataType ===
                                                          "clinical_trials"
                                                      ) && (
                                                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800/30 rounded">
                                                          Clinical Trials
                                                        </span>
                                                      )}
                                                      {healthcareResults.some(
                                                        (r: any) =>
                                                          r.dataType ===
                                                          "drug_labels"
                                                      ) && (
                                                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800/30 rounded">
                                                          Drug Labels
                                                        </span>
                                                      )}
                                                      {healthcareResults.some(
                                                        (r: any) =>
                                                          r.dataType ===
                                                          "research_papers"
                                                      ) && (
                                                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800/30 rounded">
                                                          Research Papers
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                                {part.input?.query && (
                                                  <div className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-800/30 px-2 py-1 rounded mb-2">
                                                    &quot;{part.input.query}
                                                    &quot;
                                                  </div>
                                                )}
                                                <SearchResultsCarousel
                                                  results={healthcareResults}
                                                  type="healthcare"
                                                  toolName={
                                                    part.type ===
                                                    "tool-clinicalTrialsSearch"
                                                      ? "clinicalTrialsSearch"
                                                      : part.type ===
                                                        "tool-drugInformationSearch"
                                                      ? "drugInformationSearch"
                                                      : part.type ===
                                                        "tool-biomedicalLiteratureSearch"
                                                      ? "biomedicalLiteratureSearch"
                                                      : part.type ===
                                                        "tool-pharmaCompanyAnalysis"
                                                      ? "pharmaCompanyAnalysis"
                                                      : "comprehensiveHealthcareSearch"
                                                  }
                                                  messageId={message.id}
                                                />
                                              </div>
                                            );
                                          case "output-streaming":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                                                  <span className="text-lg">
                                                    🧬
                                                  </span>
                                                  <span className="font-medium">
                                                    Healthcare Search
                                                  </span>
                                                  <Clock className="h-3 w-3 animate-spin" />
                                                </div>
                                                <div className="text-sm text-indigo-600 dark:text-indigo-300">
                                                  Retrieving results...
                                                </div>
                                              </div>
                                            );
                                          case "error":
                                            return (
                                              <div
                                                key={callId}
                                                className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                              >
                                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                                  <span className="text-lg">
                                                    ❌
                                                  </span>
                                                  <span className="font-medium">
                                                    Healthcare Search Error
                                                  </span>
                                                </div>
                                                <div className="text-sm text-red-600 dark:text-red-300">
                                                  {part.errorText}
                                                </div>
                                              </div>
                                            );
                                        }
                                        break;
                                      }

                                      // Generic dynamic tool fallback (for future tools)
                                      case "dynamic-tool":
                                        return (
                                          <div
                                            key={index}
                                            className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2 sm:p-3"
                                          >
                                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                                              <Wrench className="h-4 w-4" />
                                              <span className="font-medium">
                                                Tool: {part.toolName}
                                              </span>
                                            </div>
                                            <div className="text-sm text-purple-600 dark:text-purple-300">
                                              {part.state ===
                                                "input-streaming" && (
                                                <pre className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded text-xs">
                                                  {JSON.stringify(
                                                    part.input,
                                                    null,
                                                    2
                                                  )}
                                                </pre>
                                              )}
                                              {part.state ===
                                                "output-available" && (
                                                <pre className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded text-xs">
                                                  {JSON.stringify(
                                                    part.output,
                                                    null,
                                                    2
                                                  )}
                                                </pre>
                                              )}
                                              {part.state ===
                                                "output-error" && (
                                                <div className="text-red-600 dark:text-red-300">
                                                  Error: {part.errorText}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );

                                      default:
                                        return null;
                                    }
                                  }
                                });
                              })()}
                            </div>
                          )}

                          {/* Message Actions */}
                          {message.role === "assistant" && (
                            <div className="flex justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              {messages[messages.length - 1]?.id ===
                                message.id &&
                                canRegenerate && (
                                  <Button
                                    onClick={() => {
                                      track("Message Regenerated", {
                                        messageCount: messages.length,
                                        lastMessageRole:
                                          messages[messages.length - 1]?.role,
                                      });
                                      regenerate();
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    disabled={
                                      status !== "ready" && status !== "error"
                                    }
                                    className="h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}

                              {!isLoading && (
                                <Button
                                  onClick={() =>
                                    copyToClipboard(getMessageText(message))
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {virtualizationEnabled && (
                <>
                  <div
                    style={{
                      height: Math.max(0, visibleRange.start * avgRowHeight),
                    }}
                  />
                  <div
                    style={{
                      height: Math.max(
                        0,
                        (deferredMessages.length - visibleRange.end) *
                          avgRowHeight
                      ),
                    }}
                  />
                </>
              )}

              {/* Coffee Loading Message */}
              <AnimatePresence>
                {status === "submitted" &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.role === "user" && (
                    <motion.div
                      className="mb-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-amber-600 dark:text-amber-400 text-lg mt-0.5">
                          ☕
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 max-w-xs">
                          <div className="text-amber-700 dark:text-amber-300 text-sm">
                            Just grabbing a coffee and contemplating the meaning
                            of life... ☕️
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
              <div ref={bottomAnchorRef} className="h-px w-full" />
            </div>

            {/* Gradient fade above input form */}
            <AnimatePresence>
              {(isFormAtBottom || isMobile) && (
                <>
                  <motion.div
                    className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-3xl h-36 pointer-events-none z-45"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div
                      className="dark:hidden absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 30%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0) 100%)",
                      }}
                    />
                    <div
                      className="hidden dark:block absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgb(3 7 18) 0%, rgb(3 7 18 / 0.98) 30%, rgb(3 7 18 / 0.8) 60%, transparent 100%)",
                      }}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">
                    {error.message?.includes("PAYMENT_REQUIRED")
                      ? "Payment Setup Required"
                      : "Something went wrong"}
                  </span>
                </div>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {error.message?.includes("PAYMENT_REQUIRED")
                    ? "You need to set up a payment method to use the pay-per-use plan. You only pay for what you use."
                    : "Please check your API keys and try again."}
                </p>
                <Button
                  onClick={() => {
                    if (error.message?.includes("PAYMENT_REQUIRED")) {
                      // Redirect to subscription setup
                      const url = `/api/checkout?plan=pay_per_use&redirect=${encodeURIComponent(
                        window.location.href
                      )}`;
                      window.location.href = url;
                    } else {
                      window.location.reload();
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 text-red-700 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                >
                  {error.message?.includes("PAYMENT_REQUIRED") ? (
                    <>
                      <span className="mr-1">💳</span>
                      Setup Payment
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Input Form at bottom */}
            <AnimatePresence>
              {(isFormAtBottom || isMobile) && (
                <motion.div
                  className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-3xl px-3 sm:px-6 pt-4 sm:pt-5 pb-6 sm:pb-7 z-50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <form
                    onSubmit={handleSubmit}
                    className="max-w-3xl mx-auto space-y-2"
                  >
                    {showFileDropzone && (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">
                              Attach files &amp; media
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Drop files below or click to browse. We&apos;ll
                              add them to the next answer.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={closeFileDropzone}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3">
                          <Dropzone
                            maxFiles={5}
                            accept={{
                              "application/pdf": [".pdf"],
                              "image/*": [
                                ".png",
                                ".jpg",
                                ".jpeg",
                                ".gif",
                                ".bmp",
                                ".webp",
                              ],
                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                                [".docx"],
                              "application/json": [".json"],
                            }}
                            onDrop={handleFileDrop}
                            onError={(error) => console.error(error)}
                            src={dropzoneFiles}
                            className="w-full border-2 border-dashed border-gray-300 bg-transparent px-4 py-6 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
                          >
                            <DropzoneEmptyState />
                            <DropzoneContent />
                          </Dropzone>
                        </div>
                      </div>
                    )}
                    {Object.keys(uploadingFiles).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(uploadingFiles).map(
                          ([fileId, fileUpload]) => (
                            <div
                              key={fileId}
                              className="rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-blue-800 shadow-sm dark:border-blue-800/70 dark:bg-blue-900/20 dark:text-blue-200"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400"></div>
                                  <span className="text-xs font-medium">
                                    Uploading and processing:{" "}
                                    {fileUpload.fileName}
                                  </span>
                                </div>
                                <button
                                  onClick={() => cancelFileUpload(fileId)}
                                  className="flex h-5 w-5 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-800/30"
                                  title="Cancel upload"
                                >
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {libraryContextBanner}
                    <div className="relative flex items-end">
                      {/* Plus button for Library dropdown */}
                      <DropdownMenu
                        open={inputMenuOpen}
                        onOpenChange={setInputMenuOpen}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            // Ensure the button is visible and not covered
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-transparent hover:bg-gray-200/60 dark:hover:bg-gray-800/80 text-gray-500 dark:text-gray-300 shadow-none z-10"
                            tabIndex={-1}
                            aria-label="Open Library"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          sideOffset={6}
                          className="w-36 text-xs"
                        >
                          <DropdownMenuItem onSelect={handleFileMenuSelect}>
                            <span className="inline-flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              Files &amp; media
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              if (user) {
                                openLibraryCard();
                              } else {
                                setShowAuthModal(true);
                              }
                            }}
                          >
                            <span className="inline-flex items-center">
                              <Library className="h-4 w-4 mr-1" />
                              Library
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Textarea
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask a question..."
                        className="w-full resize-none border-gray-200 dark:border-gray-700 rounded-2xl pl-12 sm:pl-14 pr-14 sm:pr-16 py-3 sm:py-3 min-h-[44px] sm:min-h-[48px] max-h-28 sm:max-h-32 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm overflow-y-auto text-base shadow-lg border"
                        disabled={status === "error" || isLoading}
                        rows={1}
                        style={{ lineHeight: "1.5" }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                          }
                        }}
                      />
                      <Button
                        type={canStop ? "button" : "submit"}
                        onClick={canStop ? stop : undefined}
                        disabled={
                          !canStop &&
                          (isLoading || !input.trim() || status === "error")
                        }
                        className="absolute right-2 sm:right-2 top-1/2 -translate-y-1/2 rounded-xl h-8 w-8 sm:h-9 sm:w-9 p-0 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 shadow-lg"
                      >
                        {canStop ? (
                          <Square className="h-4 w-4" />
                        ) : isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 12l14 0m-7-7l7 7-7 7"
                            />
                          </svg>
                        )}
                      </Button>
                    </div>
                  </form>

                  {/* Mobile Bottom Bar - Social links and disclaimer below input */}
                  <motion.div
                    className="block sm:hidden mt-4 pt-3 border-t border-gray-200 dark:border-gray-700"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex items-center justify-center space-x-4">
                        <SocialLinks />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                        Not financial advice.
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Dialog open={showLibraryCard} onOpenChange={setShowLibraryCard}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Saved Library</DialogTitle>
                <DialogDescription>
                  Select a collection to review the answers you&apos;ve saved.
                </DialogDescription>
              </DialogHeader>

              {savedCollections.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Collection
                    </p>
                    <Select
                      value={resolvedLibraryCollectionId ?? undefined}
                      onValueChange={handleLibraryCollectionChange}
                    >
                      <SelectTrigger className="w-full justify-between">
                        <SelectValue placeholder="Select a collection" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedCollections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                    {librarySelectionPending ? (
                      <div className="p-6 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading saved results...
                      </div>
                    ) : (
                      renderLibraryItems(savedItems)
                    )}
                  </div>
                </div>
              ) : savedItems.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    These items are saved locally on this device.
                  </p>
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                    {renderLibraryItems(savedItems)}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  You haven&apos;t saved any results yet. Save a response to
                  start building your library.
                </div>
              )}
            </DialogContent>
          </Dialog>
        </SeenResultsProvider>
      </SavedResultsProvider>

      {/* Auth Modal for Library access */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
