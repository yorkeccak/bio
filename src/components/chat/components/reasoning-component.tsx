"use client";

import { memo } from "react";
import { Brain } from "lucide-react";
import { TimelineStep } from "@/components/chat/components/timeline-step";

// Reasoning component - wraps TimelineStep
export const ReasoningComponent = memo(({
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
  const reasoningText = part.text || "";
  // Extract the first meaningful line as the title and strip markdown
  const firstLine = reasoningText.split('\n').find((line: string) => line.trim().length > 0) || "";
  // Remove markdown formatting like **, *, _, etc.
  const cleanedLine = firstLine.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
  const title = cleanedLine.length > 50 ? cleanedLine.slice(0, 50) + '...' : cleanedLine || "Thinking";

  return (
    <TimelineStep
      part={part}
      messageId={messageId}
      index={index}
      status={status}
      type="reasoning"
      title={title}
      subtitle={undefined}
      icon={<Brain />}
      expandedTools={expandedTools}
      toggleToolExpansion={toggleToolExpansion}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.part.text === nextProps.part.text &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.index === nextProps.index &&
    prevProps.status === nextProps.status &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
ReasoningComponent.displayName = 'ReasoningComponent';
