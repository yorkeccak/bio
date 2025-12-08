"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from '@/utils/supabase/client-wrapper';

// Generate a smart title from the first user message
export const generateSessionTitle = (firstMessage: string): string => {
  // Create a smart title from the first user message
  const cleaned = firstMessage.trim();

  // Biomedical keywords to prioritize in titles
  const biomedKeywords = [
    'drug', 'drugs', 'medication', 'clinical', 'trial', 'trials', 'study', 'studies',
    'patient', 'patients', 'disease', 'therapy', 'treatment', 'diagnosis', 'cancer',
    'covid', 'virus', 'vaccine', 'antibody', 'protein', 'gene', 'crispr', 'genome',
    'fda', 'approval', 'phase', 'efficacy', 'safety', 'adverse', 'pubmed', 'research',
    'molecular', 'cellular', 'pathology', 'pharmacology', 'immunotherapy', 'biomarker'
  ];

  if (cleaned.length <= 50) {
    return cleaned;
  }

  // Try to find a sentence with biomedical context
  const sentences = cleaned.split(/[.!?]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 10 && trimmed.length <= 50) {
      // Check if this sentence contains biomedical keywords
      const hasBiomedContext = biomedKeywords.some(keyword =>
        trimmed.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasBiomedContext) {
        return trimmed;
      }
    }
  }

  // Fall back to smart truncation
  const truncated = cleaned.substring(0, 47);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');

  const breakPoint = Math.max(lastSpace, lastPeriod, lastQuestion);
  const title = breakPoint > 20 ? truncated.substring(0, breakPoint) : truncated;

  return title + (title.endsWith('.') || title.endsWith('?') ? '' : '...');
};

interface UseChatSessionOptions {
  user: any;
  setMessages: (messages: any[]) => void;
  onSessionCreated?: (sessionId: string) => void;
}

export const useChatSession = ({
  user,
  setMessages,
  onSessionCreated,
}: UseChatSessionOptions) => {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const sessionIdRef = useRef<string | undefined>(undefined);

  const createSession = useCallback(async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Use fast fallback title initially
      const quickTitle = generateSessionTitle(firstMessage);

      // Create session immediately with fallback title
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ title: quickTitle })
      });

      if (response.ok) {
        const { session: newSession } = await response.json();

        // Generate better AI title in background (don't wait)
        fetch('/api/chat/generate-title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ message: firstMessage })
        }).then(async (titleResponse) => {
          if (titleResponse.ok) {
            const { title: aiTitle } = await titleResponse.json();
            // Update session title in background
            await fetch(`/api/chat/sessions/${newSession.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({ title: aiTitle })
            });
          }
        }).catch(() => {
          // Ignore title generation errors
        });

        return newSession.id;
      }
    } catch (error) {
      // Session creation failed
    }
    return null;
  }, [user]);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!user) return;

    setIsLoadingSession(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const { messages: sessionMessages } = await response.json();

        // Convert session messages to the format expected by useChat
        const convertedMessages = sessionMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts,
          toolCalls: msg.toolCalls,
          createdAt: msg.createdAt,
          processing_time_ms: msg.processing_time_ms
        }));

        // Set messages in the chat
        setMessages(convertedMessages);
        sessionIdRef.current = sessionId;
        setCurrentSessionId(sessionId);

        return convertedMessages;
      }
    } catch (error) {
      // Session loading failed
    } finally {
      setIsLoadingSession(false);
    }
    return null;
  }, [user, setMessages]);

  return {
    isLoadingSession,
    currentSessionId,
    setCurrentSessionId,
    sessionIdRef,
    createSession,
    loadSessionMessages,
  };
};
