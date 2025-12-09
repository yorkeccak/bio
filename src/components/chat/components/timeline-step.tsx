"use client";

import React, { memo } from "react";
import { Check, ChevronDown, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

// Professional BioMed Research UI - Workflow-inspired with checkmarks and clean cards
export const TimelineStep = memo(({
  part,
  messageId,
  index,
  status,
  type = 'reasoning',
  title,
  subtitle,
  icon,
  expandedTools,
  toggleToolExpansion,
  children,
}: {
  part: any;
  messageId: string;
  index: number;
  status: string;
  type?: 'reasoning' | 'search' | 'action' | 'tool';
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
  children?: React.ReactNode;
}) => {
  const stepId = `step-${type}-${messageId}-${index}`;
  const isExpanded = expandedTools.has(stepId);
  const hasContent = children || (part.text && part.text.length > 0);

  const toggleExpand = () => {
    toggleToolExpansion(stepId);
  };

  const isComplete = status === 'complete';
  const isStreaming = status === 'streaming';
  const isError = status === 'error';

  return (
    <div className="group relative py-0.5 animate-in fade-in duration-200">
      {/* Minimal, refined design */}
      <div
        className={`relative flex items-start gap-4 py-4 px-3 sm:px-4 -mx-1 sm:-mx-2 rounded-md transition-all duration-150 ${
          isStreaming ? 'bg-info/5' : ''
        } ${
          hasContent ? 'hover:bg-muted/50 cursor-pointer' : ''
        }`}
        onClick={hasContent ? toggleExpand : undefined}
      >
        {/* Minimal status indicator */}
        <div className="flex-shrink-0">
          {isComplete ? (
            <div className="w-4 h-4 rounded-full bg-success/15 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-success stroke-[2.5]" />
            </div>
          ) : isStreaming ? (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full border border-info/40" />
              <div className="absolute inset-0 rounded-full border border-transparent border-t-info animate-spin" />
            </div>
          ) : isError ? (
            <div className="w-4 h-4 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertCircle className="w-2.5 h-2.5 text-destructive" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full border border-border" />
          )}
        </div>

        {/* Clean icon */}
        {icon && (
          <div className={`flex-shrink-0 w-4 h-4 ${
            isStreaming ? 'text-info' : 'text-muted-foreground'
          }`}>
            {icon}
          </div>
        )}

        {/* Clean typography */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-foreground">
              {title}
            </span>
          </div>
          {subtitle && !isExpanded && (
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {/* Minimal chevron */}
        {hasContent && !isStreaming && (
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-150 ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        )}
      </div>

      {/* Clean expanded content */}
      {isExpanded && hasContent && (
        <div className="mt-1.5 ml-6 mr-2 animate-in fade-in duration-150">
          {children || (
            <div className="text-sm leading-relaxed text-foreground/80 bg-muted/50 rounded-lg px-3 py-2.5 border-l-2 border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {part.text || ''}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.part === nextProps.part &&
    prevProps.status === nextProps.status &&
    prevProps.expandedTools === nextProps.expandedTools &&
    prevProps.children === nextProps.children
  );
});
TimelineStep.displayName = 'TimelineStep';
