"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
} from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { BiomedUIMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { useSubscription } from "@/hooks/use-subscription";
import { createClient } from '@/utils/supabase/client-wrapper';
import { track } from '@vercel/analytics';
import { AuthModal } from '@/components/auth/auth-modal';
import { RateLimitBanner } from '@/components/rate-limit-banner';
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  AlertCircle,
  Wrench,
  Check,
  Copy,
  ChevronDown,
  Brain,
  Search,
  Globe,
  BookOpen,
  Code2,
  Table,
  BarChart3,
  Atom,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CSVPreview } from "@/components/csv-preview";
import { Favicon } from "@/components/favicon";
import { calculateMessageMetrics, MessageMetrics } from "@/lib/metrics-calculator";

// Import extracted components
import { groupMessageParts } from "@/components/chat/utils/group-message-parts";
import { extractSearchResults } from "@/components/chat/utils/extract-search-results";
import { MemoizedTextPartWithCitations } from "@/components/chat/markdown/text-with-citations";
import { MemoizedChartResult } from "@/components/chat/tool-renderers/chart-result";
import { MemoizedCodeExecutionResult } from "@/components/chat/tool-renderers/code-execution-result";
import { MemoizedProteinViewerResult } from "@/components/chat/tool-renderers/protein-viewer-result";
import { TimelineStep } from "@/components/chat/components/timeline-step";
import { LiveReasoningPreview } from "@/components/chat/components/live-reasoning-preview";
import { ReasoningComponent } from "@/components/chat/components/reasoning-component";
import { LoadingIndicator } from "@/components/chat/components/loading-indicator";
import { SearchResultsCarousel } from "@/components/chat/components/search-results-carousel";
import { EmptyState } from "@/components/chat/components/empty-state";
import { ChatInputForm } from "@/components/chat/components/chat-input-form";
import { type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { UserMessage } from "@/components/chat/components/user-message";
import { useChatSession } from "@/components/chat/hooks/use-chat-session";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface ChatInterfaceProps {
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
}

export function ChatInterface({
  sessionId,
  onMessagesChange,
  onRateLimitError,
  onSessionCreated,
  onNewChat,
  rateLimitProps,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const [isFormAtBottom, setIsFormAtBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queryStartTime, setQueryStartTime] = useState<number | null>(null);
  const [liveProcessingTime, setLiveProcessingTime] = useState<number>(0);

  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { allowed, remaining, resetTime, increment } = rateLimitProps || {};
  const canSendQuery = allowed;
  const userHasInteracted = useRef(false);

  // Optimistic rate limit increment mutation
  const rateLimitMutation = useMutation({
    mutationFn: async () => {
      return Promise.resolve();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['rateLimit'] });
      const previousData = queryClient.getQueryData(['rateLimit']);
      queryClient.setQueryData(['rateLimit'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          used: (old.used || 0) + 1,
          remaining: Math.max(0, (old.remaining || 0) - 1),
          allowed: (old.used || 0) + 1 < (old.limit || 5)
        };
      });
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['rateLimit'], context.previousData);
      }
    },
  });

  const user = useAuthStore((state) => state.user);
  const subscription = useSubscription();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isMobile: isSidebarMobile, state: sidebarState } = useSidebar();

  useEffect(() => {
    const handleShowAuthModal = () => setShowAuthModal(true);
    window.addEventListener('show-auth-modal', handleShowAuthModal);
    return () => window.removeEventListener('show-auth-modal', handleShowAuthModal);
  }, []);

  const transport = useMemo(() =>
    new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages }) => {
        const headers: Record<string, string> = {};
        if (user) {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        }
        return {
          body: {
            messages,
            sessionId: sessionIdRef.current,
          },
          headers,
        };
      }
    }), [user]
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
  } = useChat<BiomedUIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['rateLimit'] });
      }
    },
    onError: (error: Error) => {
      console.error('[Chat Interface] Error:', error);
    },
  });

  // Session management hook
  const {
    isLoadingSession,
    currentSessionId,
    setCurrentSessionId,
    sessionIdRef,
    createSession,
    loadSessionMessages,
  } = useChatSession({
    user,
    setMessages,
    onSessionCreated,
  });

  // Handle stop with error catching
  const handleStop = useCallback(() => {
    try {
      stop();
    } catch (error) {
      // Silently ignore AbortError
    }
  }, [stop]);

  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [anchorInView, setAnchorInView] = useState<boolean>(true);
  const [isAtBottomState, setIsAtBottomState] = useState<boolean>(true);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldStickToBottomRef = useRef<boolean>(true);

  // Deferred messages for performance
  const deferredMessages = useDeferredValue(messages);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const displayMessages = isPageVisible ? messages : deferredMessages;

  // Virtualization
  const virtualizationEnabled = deferredMessages.length > 60;
  const [avgRowHeight, setAvgRowHeight] = useState<number>(140);
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({ start: 0, end: 30 });
  const overscan = 8;
  const visibleRangeRef = useRef(visibleRange);

  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);

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
    if (start !== visibleRangeRef.current.start || end !== visibleRangeRef.current.end) {
      setVisibleRange({ start, end });
    }
  }, [virtualizationEnabled, avgRowHeight, overscan, deferredMessages.length]);

  // Initialize and handle sessionId prop changes
  useEffect(() => {
    if (sessionId !== currentSessionId) {
      if (sessionId) {
        sessionIdRef.current = sessionId;
        loadSessionMessages(sessionId).then((msgs) => {
          if (msgs && msgs.length > 0) {
            setIsFormAtBottom(true);
            setTimeout(() => {
              const c = messagesContainerRef.current;
              if (c) {
                c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
              }
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }, 500);
          }
        });
      } else if (!sessionIdRef.current) {
        setCurrentSessionId(undefined);
        setMessages([]);
        setInput('');
        setIsFormAtBottom(false);
        setEditingMessageId(null);
        setEditingText('');
        onNewChat?.();
      }
    }
  }, [sessionId]);

  // Rate limit status
  useEffect(() => {
    setIsRateLimited(!canSendQuery);
  }, [canSendQuery]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      if (isMobileDevice) {
        setIsFormAtBottom(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle rate limit errors
  useEffect(() => {
    if (error) {
      if (error.message && (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('429'))) {
        setIsRateLimited(true);
        try {
          const errorData = JSON.parse(error.message);
          const resetTime = errorData.resetTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          onRateLimitError?.(resetTime);
        } catch (e) {
          const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          onRateLimitError?.(resetTime);
        }
      }
    }
  }, [error]);

  // Notify parent about messages
  useEffect(() => {
    onMessagesChange?.(messages.length > 0);
  }, [messages.length]);

  // Page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status]);

  // URL query sync
  useEffect(() => {
    if (isStartingNewChat) {
      setIsStartingNewChat(false);
      return;
    }
    if (isSubmitting) return;
    const queryParam = searchParams.get("q");
    if (queryParam && messages.length === 0) {
      let decodedQuery = queryParam;
      try {
        decodedQuery = decodeURIComponent(queryParam);
      } catch (e) {}
      setInput(decodedQuery);
    } else if (!queryParam && messages.length === 0) {
      setInput("");
    }
  }, [searchParams, messages.length, isStartingNewChat, isSubmitting]);

  useEffect(() => {
    if (isSubmitting && messages.length > 0) {
      setIsSubmitting(false);
    }
  }, [messages.length, isSubmitting]);

  useEffect(() => {
    if (messages.length === 0 && !isMobile) {
      setIsFormAtBottom(false);
    }
  }, [messages.length, isMobile]);

  // Live processing time
  useEffect(() => {
    const isLoading = status === "submitted" || status === "streaming";
    if (isLoading && !queryStartTime) {
      setQueryStartTime(Date.now());
    } else if (!isLoading && queryStartTime) {
      const finalTime = Date.now() - queryStartTime;
      setLiveProcessingTime(finalTime);
      setQueryStartTime(null);
    }
    if (isLoading && queryStartTime) {
      const interval = setInterval(() => {
        setLiveProcessingTime(Date.now() - queryStartTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, queryStartTime]);

  // Scroll helpers
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const threshold = 5;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= threshold;
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isLoading = status === "submitted" || status === "streaming";
    if (isLoading && shouldStickToBottomRef.current) {
      requestAnimationFrame(() => {
        const c = messagesContainerRef.current;
        if (c && c.scrollHeight > c.clientHeight + 1) {
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        } else {
          const doc = document.scrollingElement || document.documentElement;
          window.scrollTo({ top: doc.scrollHeight, behavior: "smooth" });
        }
      });
    }
  }, [messages, status, isAtBottomState, anchorInView]);

  // Scroll event handlers
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = isAtBottom();
      setIsAtBottomState(atBottom);
      shouldStickToBottomRef.current = atBottom;
      userHasInteracted.current = !atBottom;
      updateVisibleRange();
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      } else if (e.deltaY > 0) {
        setTimeout(() => {
          const atBottom = isAtBottom();
          if (atBottom) {
            userHasInteracted.current = false;
            shouldStickToBottomRef.current = true;
          }
        }, 50);
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      if (deltaY > 10) {
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    setIsAtBottomState(true);
    shouldStickToBottomRef.current = true;
    userHasInteracted.current = false;

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Bottom anchor observer
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

  // Scroll on submit
  useEffect(() => {
    if (status === "submitted") {
      userHasInteracted.current = false;
      shouldStickToBottomRef.current = true;
      setTimeout(() => {
        const c = messagesContainerRef.current;
        if (c) {
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }
  }, [status]);

  // Form handlers
  const handlePromptSubmit = async (message: PromptInputMessage) => {
    if (message.text.trim() && status === "ready") {
      if (!canSendQuery) {
        setIsRateLimited(true);
        onRateLimitError?.(resetTime?.toISOString() || new Date().toISOString());
        return;
      }

      const queryText = message.text.trim();
      setIsSubmitting(true);

      track('User Query Submitted', {
        query: queryText,
        queryLength: queryText.length,
        messageCount: messages.length,
        remainingQueries: remaining ? remaining - 1 : 0,
        hasAttachments: message.files.length > 0,
      });

      updateUrlWithQuery(queryText);
      if (!isFormAtBottom) {
        setIsFormAtBottom(true);
      }

      if (user && !currentSessionId && messages.length === 0) {
        try {
          const newSessionId = await createSession(queryText);
          if (newSessionId) {
            sessionIdRef.current = newSessionId;
            setCurrentSessionId(newSessionId);
            onSessionCreated?.(newSessionId);
          }
        } catch (error) {}
      }

      if (!user && increment) {
        try {
          await increment();
        } catch (error) {}
      }

      // Build message parts with text and attachments
      const messageParts: any[] = [{ type: "text", text: queryText }];

      // Add file attachments as file parts
      for (const file of message.files) {
        if (file.mediaType?.startsWith("image/") && file.url) {
          messageParts.push({
            type: "image",
            image: file.url,
            mediaType: file.mediaType,
          });
        } else if (file.url) {
          messageParts.push({
            type: "file",
            url: file.url,
            mediaType: file.mediaType,
            filename: file.filename,
          });
        }
      }

      sendMessage({ text: queryText, files: message.files });

      if (user) {
        rateLimitMutation.mutate();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
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
    setMessages(messages.filter((message: BiomedUIMessage) => message.id !== messageId));
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m: BiomedUIMessage) => m.id === messageId);
    if (message && message.parts[0]?.type === "text") {
      setEditingMessageId(messageId);
      setEditingText(message.parts[0].text);
    }
  };

  const handleSaveEdit = (messageId: string) => {
    setMessages(
      messages.map((message: BiomedUIMessage) =>
        message.id === messageId
          ? { ...message, parts: [{ type: "text" as const, text: editingText }] }
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

  const toggleToolExpansion = useCallback((toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {}
  }, []);

  const updateUrlWithQuery = (query: string) => {
    if (query.trim()) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      if (sessionIdRef.current) {
        url.searchParams.set('chatId', sessionIdRef.current);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handlePromptClick = (query: string) => {
    setInput("");
    updateUrlWithQuery(query);
    setIsStartingNewChat(false);
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= query.length) {
        setInput(query.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 4);
  };

  const getMessageText = (message: BiomedUIMessage) => {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  };

  const isLoading = status === "submitted" || status === "streaming";
  const canStop = status === "submitted" || status === "streaming";

  // Calculate cumulative metrics
  const cumulativeMetrics = useMemo(() => {
    let totalMetrics: MessageMetrics = {
      sourcesAnalyzed: 0,
      wordsProcessed: 0,
      timeSavedMinutes: 0,
      moneySaved: 0,
      processingTimeMs: 0,
      breakdown: {
        sourceReadingMinutes: 0,
        sourceFindingMinutes: 0,
        writingMinutes: 0,
        csvCreationMinutes: 0,
        chartCreationMinutes: 0,
        analysisMinutes: 0,
        dataProcessingMinutes: 0,
      },
    };

    messages.filter((m: BiomedUIMessage) => m.role === 'assistant').forEach((message: BiomedUIMessage) => {
      let messageParts: any[] = [];
      if (Array.isArray((message as any).content)) {
        messageParts = (message as any).content;
      } else if ((message as any).parts) {
        messageParts = (message as any).parts;
      }
      const messageMetrics = calculateMessageMetrics(messageParts);

      totalMetrics.sourcesAnalyzed += messageMetrics.sourcesAnalyzed;
      totalMetrics.wordsProcessed += messageMetrics.wordsProcessed;
      totalMetrics.timeSavedMinutes += messageMetrics.timeSavedMinutes;
      totalMetrics.moneySaved += messageMetrics.moneySaved;

      if ((message as any).processing_time_ms || (message as any).processingTimeMs) {
        totalMetrics.processingTimeMs += (message as any).processing_time_ms || (message as any).processingTimeMs || 0;
      }

      Object.keys(messageMetrics.breakdown).forEach((key) => {
        const breakdownKey = key as keyof typeof messageMetrics.breakdown;
        totalMetrics.breakdown[breakdownKey] += messageMetrics.breakdown[breakdownKey];
      });
    });

    if (liveProcessingTime > 0) {
      totalMetrics.processingTimeMs += liveProcessingTime;
    }

    return totalMetrics;
  }, [messages, liveProcessingTime]);

  // Render tool part helper
  const renderToolPart = (part: any, message: any, index: number, realIndex: number) => {
    switch (part.type) {
      case "step-start":
        return null;

      case "text":
        return (
          <div key={index} className="prose prose-sm max-w-none dark:prose-invert">
            <MemoizedTextPartWithCitations
              text={part.text}
              messageParts={message.parts}
              currentPartIndex={index}
              allMessages={deferredMessages}
              currentMessageIndex={realIndex}
            />
          </div>
        );

      case "reasoning":
        return null;

      case "tool-codeExecution": {
        const callId = part.toolCallId;
        const isStreaming = part.state === "input-streaming" || part.state === "input-available";
        const hasOutput = part.state === "output-available";
        const hasError = part.state === "output-error";

        // Extract notebook cell result from output (new format)
        const outputData = part.output || {};
        const isNotebookFormat = typeof outputData === 'object' && ('success' in outputData || 'outputs' in outputData);
        const cellSuccess = isNotebookFormat ? outputData.success : undefined;
        const cellError = isNotebookFormat ? outputData.error : undefined;

        if (hasError || (isNotebookFormat && cellSuccess === false && cellError)) {
          return (
            <div key={callId}>
              <TimelineStep
                part={part}
                messageId={message.id}
                index={index}
                status="error"
                type="tool"
                title="Python Execution Error"
                subtitle={cellError?.message || part.errorText || "Execution failed"}
                icon={<AlertCircle />}
                expandedTools={expandedTools}
                toggleToolExpansion={toggleToolExpansion}
              >
                {hasOutput && isNotebookFormat && (
                  <MemoizedCodeExecutionResult
                    code={part.input?.code || outputData.code || ""}
                    output={outputData}
                    actionId={callId}
                    expandedTools={expandedTools}
                    toggleToolExpansion={toggleToolExpansion}
                    cellIndex={outputData.cellIndex}
                    executionOrder={outputData.executionOrder}
                    success={outputData.success}
                    error={outputData.error}
                    retryCount={outputData.retryCount}
                    executionTimeMs={outputData.executionTimeMs}
                    outputs={outputData.outputs}
                    isNewSession={outputData.isNewSession}
                  />
                )}
              </TimelineStep>
            </div>
          );
        }

        const description = part.input?.description || outputData.description || "Executed Python code";
        const cellIndexLabel = isNotebookFormat && outputData.executionOrder !== undefined
          ? `Cell [${outputData.executionOrder}]`
          : "Code & Output";

        return (
          <div key={callId}>
            <TimelineStep
              part={part}
              messageId={message.id}
              index={index}
              status={isStreaming ? "streaming" : "complete"}
              type="tool"
              title={cellIndexLabel}
              subtitle={description}
              icon={<Code2 />}
              expandedTools={expandedTools}
              toggleToolExpansion={toggleToolExpansion}
            >
              {hasOutput && (
                <MemoizedCodeExecutionResult
                  code={part.input?.code || outputData.code || ""}
                  output={isNotebookFormat ? outputData : part.output}
                  actionId={callId}
                  expandedTools={expandedTools}
                  toggleToolExpansion={toggleToolExpansion}
                  cellIndex={isNotebookFormat ? outputData.cellIndex : undefined}
                  executionOrder={isNotebookFormat ? outputData.executionOrder : undefined}
                  success={isNotebookFormat ? outputData.success : undefined}
                  error={isNotebookFormat ? outputData.error : undefined}
                  retryCount={isNotebookFormat ? outputData.retryCount : undefined}
                  executionTimeMs={isNotebookFormat ? outputData.executionTimeMs : undefined}
                  outputs={isNotebookFormat ? outputData.outputs : undefined}
                  isNewSession={isNotebookFormat ? outputData.isNewSession : undefined}
                />
              )}
            </TimelineStep>
          </div>
        );
      }

      case "tool-clinicalTrialsSearch":
      case "tool-webSearch":
      case "tool-biomedicalLiteratureSearch":
      case "tool-drugInformationSearch": {
        const callId = part.toolCallId;
        const isStreaming = part.state === "input-streaming" || part.state === "input-available";
        const hasResults = part.state === "output-available";
        const hasError = part.state === "output-error";

        const toolConfigMap = {
          "tool-clinicalTrialsSearch": { title: "Clinical Trials Search", icon: <Search />, type: "clinical" as const },
          "tool-webSearch": { title: "Web Search", icon: <Globe />, type: "web" as const },
          "tool-biomedicalLiteratureSearch": { title: "Literature Search", icon: <BookOpen />, type: "literature" as const },
          "tool-drugInformationSearch": { title: "Drug Information", icon: <Search />, type: "drug" as const },
        };
        const toolConfig = toolConfigMap[part.type as keyof typeof toolConfigMap];

        if (hasError) {
          return (
            <div key={callId} className="my-1">
              <TimelineStep
                part={part}
                messageId={message.id}
                index={index}
                status="error"
                type="search"
                title={`${toolConfig.title} Error`}
                subtitle={part.errorText}
                icon={<AlertCircle />}
                expandedTools={expandedTools}
                toggleToolExpansion={toggleToolExpansion}
              />
            </div>
          );
        }

        const results = hasResults ? extractSearchResults(part.output) : [];
        const query = part.input?.query || "";

        let subtitleContent: React.ReactNode = query;
        if (!isStreaming && results.length > 0) {
          const displayResults = results.slice(0, 5);
          subtitleContent = (
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">{query}</div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {displayResults.map((result: any, idx: number) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden"
                      style={{ zIndex: 5 - idx }}
                    >
                      <Favicon url={result.url} size={12} className="w-3 h-3" />
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {results.length} results
                </span>
              </div>
            </div>
          );
        }

        return (
          <div key={callId}>
            <TimelineStep
              part={part}
              messageId={message.id}
              index={index}
              status={isStreaming ? "streaming" : "complete"}
              type="search"
              title={toolConfig.title}
              subtitle={subtitleContent}
              icon={toolConfig.icon}
              expandedTools={expandedTools}
              toggleToolExpansion={toggleToolExpansion}
            >
              {hasResults && results.length > 0 && (
                <SearchResultsCarousel results={results} type={toolConfig.type} />
              )}
            </TimelineStep>
          </div>
        );
      }

      case "tool-createChart": {
        const callId = part.toolCallId;
        const isStreaming = part.state === "input-streaming" || part.state === "input-available";
        const hasOutput = part.state === "output-available";
        const hasError = part.state === "output-error";

        if (hasError) {
          return (
            <div key={callId}>
              <TimelineStep
                part={part}
                messageId={message.id}
                index={index}
                status="error"
                type="tool"
                title="Chart Creation Error"
                subtitle={part.errorText}
                icon={<AlertCircle />}
                expandedTools={expandedTools}
                toggleToolExpansion={toggleToolExpansion}
              />
            </div>
          );
        }

        const title = hasOutput && part.output?.title ? part.output.title : "Chart";

        return (
          <div key={callId}>
            <TimelineStep
              part={part}
              messageId={message.id}
              index={index}
              status={isStreaming ? "streaming" : "complete"}
              type="tool"
              title={title}
              subtitle={hasOutput && part.output?.metadata ? `${part.output.metadata.totalSeries} series · ${part.output.metadata.totalDataPoints} points` : undefined}
              icon={<BarChart3 />}
              expandedTools={expandedTools}
              toggleToolExpansion={toggleToolExpansion}
            >
              {hasOutput && (
                <MemoizedChartResult
                  chartData={part.output}
                  actionId={callId}
                  expandedTools={expandedTools}
                  toggleToolExpansion={toggleToolExpansion}
                />
              )}
            </TimelineStep>
          </div>
        );
      }

      case "tool-createCSV": {
        const callId = part.toolCallId;
        const isStreaming = part.state === "input-streaming" || part.state === "input-available";
        const hasOutput = part.state === "output-available";
        const hasError = part.state === "output-error" || part.output?.error;

        if (hasError) {
          return (
            <div key={callId}>
              <TimelineStep
                part={part}
                messageId={message.id}
                index={index}
                status="error"
                type="tool"
                title="CSV Creation Error"
                subtitle={part.output?.message || part.errorText}
                icon={<AlertCircle />}
                expandedTools={expandedTools}
                toggleToolExpansion={toggleToolExpansion}
              />
            </div>
          );
        }

        const title = hasOutput && part.output?.title ? part.output.title : "CSV Table";
        const subtitle = hasOutput ? `${part.output.rowCount} rows · ${part.output.columnCount} columns` : undefined;

        return (
          <div key={callId}>
            <TimelineStep
              part={part}
              messageId={message.id}
              index={index}
              status={isStreaming ? "streaming" : "complete"}
              type="tool"
              title={title}
              subtitle={subtitle}
              icon={<Table />}
              expandedTools={expandedTools}
              toggleToolExpansion={toggleToolExpansion}
            >
              {hasOutput && !part.output?.error && (
                <CSVPreview {...part.output} />
              )}
            </TimelineStep>
          </div>
        );
      }

      case "tool-proteinViewer": {
        const callId = part.toolCallId;
        const isStreaming = part.state === "input-streaming" || part.state === "input-available";
        const hasOutput = part.state === "output-available";
        const hasError = part.state === "output-error" || part.output?.error;

        if (hasError) {
          return (
            <div key={callId}>
              <TimelineStep
                part={part}
                messageId={message.id}
                index={index}
                status="error"
                type="tool"
                title="Protein Viewer Error"
                subtitle={part.output?.message || part.errorText}
                icon={<AlertCircle />}
                expandedTools={expandedTools}
                toggleToolExpansion={toggleToolExpansion}
              />
            </div>
          );
        }

        const proteinName = hasOutput && part.output?.proteinName
          ? part.output.proteinName
          : part.input?.query || "Protein Structure";

        const pdbId = hasOutput && part.output?.pdbId
          ? part.output.pdbId.toUpperCase()
          : "Loading...";

        const subtitle = hasOutput && part.output?.searchScore
          ? `PDB: ${pdbId} • Relevance: ${(part.output.searchScore * 100).toFixed(0)}%`
          : isStreaming
          ? "Searching protein database..."
          : `PDB: ${pdbId}`;

        return (
          <div key={callId}>
            <TimelineStep
              part={part}
              messageId={message.id}
              index={index}
              status={isStreaming ? "streaming" : "complete"}
              type="tool"
              title={proteinName}
              subtitle={subtitle}
              icon={<Atom />}
              expandedTools={expandedTools}
              toggleToolExpansion={toggleToolExpansion}
            >
              {hasOutput && !part.output?.error && (
                <MemoizedProteinViewerResult
                  pdbId={part.output.pdbId}
                  proteinName={part.output.proteinName}
                  searchScore={part.output.searchScore}
                  structureId={part.output.structureId}
                />
              )}
            </TimelineStep>
          </div>
        );
      }

      case "dynamic-tool":
        return (
          <div key={index} className="mt-2 bg-info/10 border border-info/20 rounded p-2 sm:p-3">
            <div className="flex items-center gap-2 text-info-foreground mb-2">
              <Wrench className="h-4 w-4" />
              <span className="font-medium">Tool: {part.toolName}</span>
            </div>
            <div className="text-sm text-info-foreground/80">
              {part.state === "input-streaming" && (
                <pre className="bg-info/5 p-2 rounded text-xs">
                  {JSON.stringify(part.input, null, 2)}
                </pre>
              )}
              {part.state === "output-available" && (
                <pre className="bg-info/5 p-2 rounded text-xs">
                  {JSON.stringify(part.output, null, 2)}
                </pre>
              )}
              {part.state === "output-error" && (
                <div className="text-destructive">
                  Error: {part.errorText}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative min-h-0">
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className={`space-y-4 sm:space-y-8 min-h-[300px] overflow-y-auto overflow-x-hidden ${
          messages.length > 0 ? "pt-20 sm:pt-24" : "pt-2 sm:pt-4"
        } ${isFormAtBottom ? "pb-44 sm:pb-36" : "pb-4 sm:pb-8"}`}
      >
        {messages.length === 0 && (
          <>

            {/* Input Form when not at bottom (desktop only) */}
            {!isFormAtBottom && !isMobile && (
              <motion.div
                className="mt-8 mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <ChatInputForm
                  input={input}
                  onInputChange={handleInputChange}
                  onSubmit={handlePromptSubmit}
                  isLoading={isLoading}
                  canStop={canStop}
                  onStop={handleStop}
                  disabled={status === "error"}
                  className="w-full max-w-3xl mx-auto"
                  metrics={cumulativeMetrics}
                  showMetrics={messages.length > 0}
                />
              </motion.div>
            )}
            <EmptyState onPromptClick={handlePromptClick} />
          </>
        )}

        <AnimatePresence initial={!virtualizationEnabled}>
          {(virtualizationEnabled
            ? deferredMessages
                .slice(visibleRange.start, visibleRange.end)
                .map((message: BiomedUIMessage, i: number) => ({
                  item: message,
                  realIndex: visibleRange.start + i,
                }))
            : displayMessages.map((m: BiomedUIMessage, i: number) => ({ item: m, realIndex: i }))
          ).map(({ item: message, realIndex }: { item: BiomedUIMessage; realIndex: number }) => (
            <motion.div
              key={message.id}
              className="group"
              initial={virtualizationEnabled ? undefined : { opacity: 0, y: 20 }}
              animate={virtualizationEnabled ? undefined : { opacity: 1, y: 0 }}
              exit={virtualizationEnabled ? undefined : { opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {message.role === "user" ? (
                <UserMessage
                  message={message}
                  isEditing={editingMessageId === message.id}
                  editingText={editingText}
                  onEditingTextChange={setEditingText}
                  onEdit={() => handleEditMessage(message.id)}
                  onSave={() => handleSaveEdit(message.id)}
                  onCancel={handleCancelEdit}
                  onDelete={() => handleDeleteMessage(message.id)}
                />
              ) : (
                /* Assistant Message */
                <div className="mb-6 sm:mb-8 group px-3 sm:px-0">
                  {editingMessageId !== message.id && (
                    <div className="space-y-5">
                      {(() => {
                        const groupedParts = groupMessageParts(message.parts);
                        const reasoningSteps = groupedParts.filter(g => g.type === "reasoning-group").length;
                        const toolCalls = groupedParts.filter(g => g.type !== "reasoning-group" && g.part?.type?.startsWith("tool-")).length;
                        const totalActions = reasoningSteps + toolCalls;
                        const hasTextOutput = groupedParts.some(g => g.part?.type === "text");
                        const isLastMessage = realIndex === messages.length - 1;
                        const messageIsComplete = hasTextOutput && (!isLastMessage || !isLoading);
                        const hasActivity = groupedParts.some(g =>
                          g.type === "reasoning-group" || g.part?.type?.startsWith("tool-")
                        );

                        const latestStep = groupedParts[groupedParts.length - 1];
                        let latestStepTitle = "";
                        let latestStepIcon = <Brain className="h-5 w-5" />;

                        if (latestStep) {
                          if (latestStep.type === "reasoning-group") {
                            const allText = latestStep.parts.map((item: any) => item.part?.text || "").join("\n\n");
                            const lines = allText.split('\n').filter((l: string) => l.trim());
                            const titleLine = lines.find((l: string) => l.match(/^\*\*.*\*\*$/));
                            if (titleLine) {
                              latestStepTitle = titleLine.replace(/\*\*/g, '').trim();
                            } else if (lines.length > 0) {
                              latestStepTitle = lines[0].trim();
                            } else {
                              latestStepTitle = "Thinking...";
                            }
                            latestStepIcon = <Brain className="h-5 w-5 text-purple-500" />;
                          } else if (latestStep.part?.type?.startsWith("tool-")) {
                            const toolType = latestStep.part.type.replace("tool-", "");
                            const toolIcons: Record<string, React.ReactElement> = {
                              clinicalTrialsSearch: <Search className="h-5 w-5 text-blue-500" />,
                              drugInformationSearch: <Search className="h-5 w-5 text-purple-500" />,
                              biomedicalLiteratureSearch: <BookOpen className="h-5 w-5 text-indigo-500" />,
                              webSearch: <Globe className="h-5 w-5 text-green-500" />,
                              codeExecution: <Code2 className="h-5 w-5 text-orange-500" />,
                              createChart: <BarChart3 className="h-5 w-5 text-cyan-500" />,
                              createCSV: <Table className="h-5 w-5 text-teal-500" />,
                            };
                            latestStepTitle = toolType === "clinicalTrialsSearch" ? "Clinical Trials" :
                                              toolType === "drugInformationSearch" ? "Drug Information" :
                                              toolType === "biomedicalLiteratureSearch" ? "Literature Search" :
                                              toolType === "webSearch" ? "Web Search" :
                                              toolType === "codeExecution" ? "Code Execution" :
                                              toolType === "createChart" ? "Creating Chart" :
                                              toolType === "createCSV" ? "Creating Table" : toolType;
                            latestStepIcon = toolIcons[toolType] || latestStepIcon;
                          }
                        }

                        const displayParts = isTraceExpanded
                          ? groupedParts
                          : groupedParts.filter(g => {
                              if (g.type === "reasoning-group") return false;
                              if (g.part?.type?.startsWith("tool-")) return false;
                              return g.part?.type === "text";
                            });

                        return (
                          <>
                            {hasActivity && (
                              <button
                                onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                                className="w-full flex items-start gap-4 px-4 py-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border hover:border-border/80 hover:shadow-sm transition-all mb-4 text-left group"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {messageIsComplete ? (
                                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                      <Check className="h-5 w-5 text-success" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                                      {latestStepIcon}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {messageIsComplete ? (
                                    <>
                                      <div className="text-sm font-semibold text-foreground mb-1">Completed</div>
                                      <div className="text-sm text-muted-foreground">
                                        Performed {totalActions} {totalActions === 1 ? 'action' : 'actions'}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="text-sm font-semibold text-foreground">
                                          {latestStepTitle || "Working..."}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-info rounded-full animate-pulse" />
                                          <div className="w-1 h-1 bg-info rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                                          <div className="w-1 h-1 bg-info rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors mt-1">
                                  <span className="hidden sm:inline">{isTraceExpanded ? 'Hide' : 'Show'}</span>
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isTraceExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </button>
                            )}

                            {displayParts.map((group, groupIndex) => {
                              if (group.type === "reasoning-group") {
                                const combinedText = group.parts.map((item: any) => item.part.text).join("\n\n");
                                const firstPart = group.parts[0].part;
                                const isStreaming = group.parts.some((item: any) => item.part.state === "streaming");

                                let previewTitle = "";
                                let previewLines: string[] = [];

                                if (isStreaming && combinedText) {
                                  const allLines = combinedText.split('\n').filter((l: string) => l.trim());
                                  let lastTitleIndex = -1;
                                  for (let i = allLines.length - 1; i >= 0; i--) {
                                    if (allLines[i].match(/^\*\*.*\*\*$/)) {
                                      lastTitleIndex = i;
                                      previewTitle = allLines[i].replace(/\*\*/g, '');
                                      break;
                                    }
                                  }
                                  if (lastTitleIndex !== -1 && lastTitleIndex < allLines.length - 1) {
                                    previewLines = allLines.slice(lastTitleIndex + 1);
                                  } else if (lastTitleIndex === -1 && allLines.length > 0) {
                                    previewLines = allLines;
                                  }
                                }

                                return (
                                  <React.Fragment key={`reasoning-group-${groupIndex}`}>
                                    <ReasoningComponent
                                      part={{ ...firstPart, text: combinedText }}
                                      messageId={message.id}
                                      index={groupIndex}
                                      status={isStreaming ? "streaming" : "complete"}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    />
                                    {isStreaming && previewLines.length > 0 && (
                                      <LiveReasoningPreview title={previewTitle} lines={previewLines} />
                                    )}
                                  </React.Fragment>
                                );
                              } else {
                                const { part, index } = group;
                                return renderToolPart(part, message, index, realIndex);
                              }
                            })}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Message Actions */}
                  {message.role === "assistant" && !isLoading && (
                    <div className="flex justify-end gap-2 mt-6 pt-4 mb-8 border-t border-border">
                      <button
                        onClick={() => copyToClipboard(getMessageText(message))}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {virtualizationEnabled && (
          <>
            <div style={{ height: Math.max(0, visibleRange.start * avgRowHeight) }} />
            <div style={{ height: Math.max(0, (deferredMessages.length - visibleRange.end) * avgRowHeight) }} />
          </>
        )}

        {/* Loading Indicator */}
        <AnimatePresence>
          {status === "submitted" &&
            deferredMessages.length > 0 &&
            deferredMessages[deferredMessages.length - 1]?.role === "user" && (
              <LoadingIndicator />
            )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
        <div ref={bottomAnchorRef} className="h-px w-full" />
      </div>

      {/* Gradient fade above input form */}
      <AnimatePresence>
        {(isFormAtBottom || isMobile) && (
          <motion.div
            className={cn(
              "fixed bottom-0 w-full max-w-3xl h-36 pointer-events-none z-45 -translate-x-1/2 transition-[left] duration-200 ease-linear",
              isSidebarMobile || sidebarState === "collapsed"
                ? "left-1/2"
                : "left-[calc(50%+var(--sidebar-width)/2)]"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5]/80 to-transparent dark:from-gray-950 dark:via-gray-950/80"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">
              {error.message?.includes('PAYMENT_REQUIRED') ? 'Payment Setup Required' : 'Something went wrong'}
            </span>
          </div>
          <p className="text-destructive/80 text-sm mt-1">
            {error.message?.includes('PAYMENT_REQUIRED')
              ? 'You need to set up a payment method to use the pay-per-use plan. You only pay for what you use.'
              : 'Please check your API keys and try again.'
            }
          </p>
          <Button
            onClick={() => {
              if (error.message?.includes('PAYMENT_REQUIRED')) {
                const url = `/api/checkout?plan=pay_per_use&redirect=${encodeURIComponent(window.location.href)}`;
                window.location.href = url;
              } else {
                window.location.reload();
              }
            }}
            variant="outline"
            size="sm"
            className="mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {error.message?.includes('PAYMENT_REQUIRED') ? (
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

      {/* Fixed Input Form */}
      <AnimatePresence>
        {(isFormAtBottom || isMobile) && (
          <motion.div
            className={cn(
              "fixed bottom-0 w-full max-w-3xl px-2 sm:px-0 pt-4 pb-5 sm:pb-6 z-50 -translate-x-1/2 transition-[left] duration-200 ease-linear",
              isSidebarMobile || sidebarState === "collapsed"
                ? "left-1/2"
                : "left-[calc(50%+var(--sidebar-width)/2)]"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ChatInputForm
              input={input}
              onInputChange={handleInputChange}
              onSubmit={handlePromptSubmit}
              isLoading={isLoading}
              canStop={canStop}
              onStop={handleStop}
              disabled={status === "error"}
              className="w-full max-w-3xl mx-auto"
              metrics={cumulativeMetrics}
              showMetrics={messages.length > 0}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rate Limit Banner */}
      <RateLimitBanner />

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
