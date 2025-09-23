"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useEffect,
} from "react";

type CachedResult = {
  id: string;
  tool?: string;
  messageId: string;
  result: any;
};

type SeenResultsState = {
  get: (id: string) => CachedResult | undefined;
  setIfAbsent: (entry: CachedResult) => void;
  has: (id: string) => boolean;
  clear: () => void;
};

const SeenResultsContext = createContext<SeenResultsState | null>(null);

export function SeenResultsProvider({
  sessionKey,
  children,
}: {
  sessionKey?: string;
  children: React.ReactNode;
}) {
  // Use a ref so updates don’t trigger re-renders; consumers can read synchronously
  const storeRef = useRef<Map<string, CachedResult>>(new Map());
  const lastSessionKeyRef = useRef<string | undefined>(undefined);

  // Reset store if session key changed
  // Only clear when switching between two different non-empty session keys.
  // This avoids wiping the cache during the initial undefined -> sessionId transition.
  if (
    lastSessionKeyRef.current &&
    sessionKey &&
    lastSessionKeyRef.current !== sessionKey
  ) {
    storeRef.current = new Map();
  }
  lastSessionKeyRef.current = sessionKey;
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as any).__seenResults = {
      size: () => storeRef.current.size,
      keys: () => Array.from(storeRef.current.keys()),
      entries: () => Array.from(storeRef.current.entries()),
      clear: () => storeRef.current.clear(),
      sessionKey,
    };
    console.log(
      "[SeenResults] session =",
      sessionKey,
      "size =",
      storeRef.current.size
    );
  }, [sessionKey]);

  const api = useMemo<SeenResultsState>(
    () => ({
      get: (id: string) => storeRef.current.get(id),
      has: (id: string) => storeRef.current.has(id),
      setIfAbsent: (entry: CachedResult) => {
        if (!entry?.id) return;
        if (!storeRef.current.has(entry.id)) {
          storeRef.current.set(entry.id, entry);
        }
      },
      clear: () => storeRef.current.clear(),
    }),
    []
  );

  return (
    <SeenResultsContext.Provider value={api}>
      {children}
    </SeenResultsContext.Provider>
  );
}

export function useSeenResults() {
  const ctx = useContext(SeenResultsContext);
  if (!ctx)
    throw new Error("useSeenResults must be used within SeenResultsProvider");
  return ctx;
}
 