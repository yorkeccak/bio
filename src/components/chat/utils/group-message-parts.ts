// Helper function to group message parts - memoized to prevent re-computation on every render
export function groupMessageParts(parts: any[]): any[] {
  const groupedParts: any[] = [];
  let currentReasoningGroup: any[] = [];
  const seenToolCallIds = new Set<string>();

  parts.forEach((part, index) => {
    // Skip step-start markers entirely - they're metadata from AI SDK
    if (part.type === "step-start") {
      return;
    }

    // Deduplicate tool calls by toolCallId - skip if we've already seen this tool call
    if (part.toolCallId && seenToolCallIds.has(part.toolCallId)) {
      return;
    }

    // Track this tool call ID
    if (part.toolCallId) {
      seenToolCallIds.add(part.toolCallId);
    }

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
      groupedParts.push({ type: "single", part, index });
    }
  });

  // Add any remaining reasoning group
  if (currentReasoningGroup.length > 0) {
    groupedParts.push({
      type: "reasoning-group",
      parts: currentReasoningGroup,
    });
  }

  return groupedParts;
}
