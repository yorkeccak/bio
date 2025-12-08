'use client';

import { OllamaStatusIndicator } from './ollama-status-indicator';

interface OllamaStatusWrapperProps {
  hasMessages?: boolean;
}

export function OllamaStatusWrapper({ hasMessages }: OllamaStatusWrapperProps) {
  // Only render the indicator in development mode
  if (process.env.NEXT_PUBLIC_APP_MODE !== 'development') {
    return null;
  }

  return <OllamaStatusIndicator hasMessages={hasMessages} />;
}
