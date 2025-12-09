"use client";

import { ChangeEvent } from "react";
import { Square } from "lucide-react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { MetricsPills } from "@/components/metrics-pills";
import { MessageMetrics } from "@/lib/metrics-calculator";

export interface ChatInputFormProps {
  input: string;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (message: PromptInputMessage) => void;
  isLoading: boolean;
  canStop: boolean;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
  metrics?: MessageMetrics;
  showMetrics?: boolean;
}

export function ChatInputForm({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  canStop,
  onStop,
  disabled = false,
  className,
  metrics,
  showMetrics = false,
}: ChatInputFormProps) {
  return (
    <div className={className}>
      {showMetrics && metrics && (
        <div className="mb-2">
          <MetricsPills metrics={metrics} />
        </div>
      )}
      <PromptInput
        onSubmit={onSubmit}
        accept="image/*,.pdf,.csv,.txt,.json,.md"
        multiple
    >
      <PromptInputAttachments>
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
      <PromptInputTextarea
        placeholder="Ask a question..."
        value={input}
        onChange={onInputChange}
        disabled={disabled || isLoading}
      />
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        {canStop ? (
          <PromptInputButton onClick={onStop} variant="default" size="icon-sm">
            <Square className="size-4" />
          </PromptInputButton>
        ) : (
          <PromptInputSubmit
            status={isLoading ? "streaming" : disabled ? "error" : undefined}
            disabled={disabled || isLoading || !input.trim()}
          />
        )}
      </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
