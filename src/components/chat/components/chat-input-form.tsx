"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MetricsPills } from "@/components/metrics-pills";
import { MessageMetrics } from "@/lib/metrics-calculator";
import { Square, Loader2 } from "lucide-react";

interface ChatInputFormProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  canStop: boolean;
  onStop: () => void;
  disabled?: boolean;
  metrics?: MessageMetrics;
  showMetrics?: boolean;
  variant?: 'inline' | 'fixed';
}

export const ChatInputForm = ({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  canStop,
  onStop,
  disabled = false,
  metrics,
  showMetrics = false,
  variant = 'fixed',
}: ChatInputFormProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  if (variant === 'inline') {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
        {/* Metrics Pills - connected to input box */}
        {showMetrics && metrics && (
          <div className="mb-2">
            <MetricsPills metrics={metrics} />
          </div>
        )}
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end">
            <Textarea
              value={input}
              onChange={onInputChange}
              placeholder="Ask a question..."
              className="w-full resize-none rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 pr-14 sm:pr-16 min-h-[38px] sm:min-h-[40px] max-h-28 sm:max-h-32 overflow-y-auto text-sm sm:text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm"
              disabled={disabled || isLoading}
              rows={1}
              style={{ lineHeight: "1.5" }}
              onKeyDown={handleKeyDown}
            />
            <Button
              type={canStop ? "button" : "submit"}
              onClick={canStop ? onStop : undefined}
              disabled={
                !canStop &&
                (isLoading || !input.trim() || disabled)
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
      </div>
    );
  }

  // Fixed variant (at bottom of screen)
  return (
    <>
      {/* Metrics Pills - connected to input box */}
      {showMetrics && metrics && (
        <div className="mb-2">
          <MetricsPills metrics={metrics} />
        </div>
      )}

      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-2.5 relative flex items-center">
          <Textarea
            value={input}
            onChange={onInputChange}
            placeholder="Ask a question..."
            className="w-full resize-none border-0 px-0 py-2 pr-12 min-h-[36px] max-h-24 focus:ring-0 focus-visible:ring-0 bg-transparent overflow-y-auto text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-none"
            disabled={disabled || isLoading}
            rows={1}
            style={{ lineHeight: "1.5", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
            onKeyDown={handleKeyDown}
          />
          <Button
            type={canStop ? "button" : "submit"}
            onClick={canStop ? onStop : undefined}
            disabled={
              !canStop &&
              (isLoading || !input.trim() || disabled)
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-8 w-8 p-0 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 shadow-sm transition-colors"
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
    </>
  );
};
