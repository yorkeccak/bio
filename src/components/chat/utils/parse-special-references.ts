// Helper to parse and extract CSV/chart references from markdown
export const parseSpecialReferences = (text: string): Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> => {
  const segments: Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> = [];

  // Pattern to match ![alt](csv:uuid) or ![alt](/api/csvs/uuid) or chart references
  const pattern = /!\[([^\]]*)\]\((csv:[a-f0-9-]+|\/api\/csvs\/[a-f0-9-]+|\/api\/charts\/[^\/]+\/image)\)/gi;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the reference
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    const url = match[2];

    // Check if it's a CSV reference
    const csvProtocolMatch = url.match(/^csv:([a-f0-9-]+)$/i);
    const csvApiMatch = url.match(/^\/api\/csvs\/([a-f0-9-]+)$/i);

    if (csvProtocolMatch || csvApiMatch) {
      const csvId = (csvProtocolMatch || csvApiMatch)![1];
      segments.push({
        type: 'csv',
        content: match[0],
        id: csvId
      });
    } else {
      // Chart reference
      const chartMatch = url.match(/^\/api\/charts\/([^\/]+)\/image$/);
      if (chartMatch) {
        segments.push({
          type: 'chart',
          content: match[0],
          id: chartMatch[1]
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
};
