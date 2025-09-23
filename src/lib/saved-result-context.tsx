"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

export type SavedItem = {
  id: string;
  title: string;
  url?: string;
  source?: string;
  type?: "financial" | "web" | "wiley" | "healthcare";
  date?: string;
  data?: any; // optional full payload
};

export type SavedCollection = {
  id: string;
  title: string;
  createdAt: string;
};

type SavedApi = {
  items: SavedItem[];
  has: (id: string) => boolean;
  add: (item: SavedItem) => void;
  remove: (id: string) => void;
  toggle: (item: SavedItem) => void;
  clear: () => void;
  // Collections API (client-only, local persistence)
  collections: SavedCollection[];
  activeCollectionId: string | null;
  setActiveCollection: (id: string | null) => void;
  createCollection: (title: string) => Promise<string | null>;
  addToCollection: (collectionId: string, item: SavedItem) => Promise<void>;
  removeFromCollection: (collectionId: string, itemId: string) => Promise<void>;
  getActiveCollectionItems: () => SavedItem[];
};

const SavedContext = createContext<SavedApi | null>(null);
const STORAGE_KEY_ITEMS = "likedResults_v1";
const STORAGE_KEY_COLLECTIONS = "savedCollections_v1";
const STORAGE_KEY_MAP = "collectionItems_v1"; // map of collectionId -> itemIds[]

export function SavedResultsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [collectionItems, setCollectionItems] = useState<
    Record<string, string[]>
  >({});
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );

  // Load collections from Supabase when user is authenticated
  useEffect(() => {
    const loadCollectionsFromSupabase = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // Load collections from Supabase
          const response = await fetch("/api/collections", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const { collections: supabaseCollections } = await response.json();
            setCollections(supabaseCollections);
            if (supabaseCollections.length > 0 && !activeCollectionId) {
              setActiveCollectionId(supabaseCollections[0].id);
            }

            // Load collection items for each collection
            const collectionItemsMap: Record<string, string[]> = {};
            for (const collection of supabaseCollections) {
              try {
                const itemsResponse = await fetch(
                  `/api/collections/${collection.id}/items`,
                  {
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  }
                );

                if (itemsResponse.ok) {
                  const { items } = await itemsResponse.json();
                  collectionItemsMap[collection.id] = items.map(
                    (item: any) => item.data?.originalId || item.id
                  );

                  // Add items to global items list (convert collection items back to SavedItem format)
                  setItems((prev) => {
                    const existingIds = new Set(prev.map((item) => item.id));
                    const newItems = items
                      .map((item: any) => ({
                        id: item.data?.originalId || item.id,
                        title: item.title,
                        url: item.url,
                        source: item.source,
                        type: item.type,
                        date: item.occurred_at,
                        data: item.data,
                      }))
                      .filter((item: any) => !existingIds.has(item.id));
                    return [...newItems, ...prev];
                  });
                }
              } catch (error) {
                console.error(
                  `Error loading items for collection ${collection.id}:`,
                  error
                );
              }
            }
            setCollectionItems(collectionItemsMap);
          }
        } else {
          // Fallback to localStorage for unauthenticated users
          const rawItems = localStorage.getItem(STORAGE_KEY_ITEMS);
          if (rawItems) {
            const parsed = JSON.parse(rawItems);
            if (Array.isArray(parsed)) setItems(parsed);
          }
          const rawCollections = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
          if (rawCollections) {
            const parsedCols = JSON.parse(rawCollections);
            if (Array.isArray(parsedCols)) setCollections(parsedCols);
          }
          const rawMap = localStorage.getItem(STORAGE_KEY_MAP);
          if (rawMap) {
            const parsedMap = JSON.parse(rawMap);
            if (parsedMap && typeof parsedMap === "object")
              setCollectionItems(parsedMap);
          }
          // Initialize active collection if any
          if (
            activeCollectionId === null &&
            Array.isArray(collections) &&
            collections.length > 0
          ) {
            setActiveCollectionId(collections[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading collections:", error);
        // Fallback to localStorage
        try {
          const rawItems = localStorage.getItem(STORAGE_KEY_ITEMS);
          if (rawItems) {
            const parsed = JSON.parse(rawItems);
            if (Array.isArray(parsed)) setItems(parsed);
          }
          const rawCollections = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
          if (rawCollections) {
            const parsedCols = JSON.parse(rawCollections);
            if (Array.isArray(parsedCols)) setCollections(parsedCols);
          }
          const rawMap = localStorage.getItem(STORAGE_KEY_MAP);
          if (rawMap) {
            const parsedMap = JSON.parse(rawMap);
            if (parsedMap && typeof parsedMap === "object")
              setCollectionItems(parsedMap);
          }
        } catch {}
      }
    };

    loadCollectionsFromSupabase();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_COLLECTIONS,
        JSON.stringify(collections)
      );
    } catch {}
  }, [collections]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(collectionItems));
    } catch {}
  }, [collectionItems]);

  const api = useMemo<SavedApi>(
    () => ({
      items,
      has: (id) => items.some((it) => it.id === id),
      add: (item) =>
        setItems((prev) =>
          prev.some((it) => it.id === item.id) ? prev : [item, ...prev]
        ),
      remove: (id) => setItems((prev) => prev.filter((it) => it.id !== id)),
      toggle: (item) =>
        setItems((prev) =>
          prev.some((it) => it.id === item.id)
            ? prev.filter((it) => it.id !== item.id)
            : [item, ...prev]
        ),
      clear: () => setItems([]),
      collections,
      activeCollectionId,
      setActiveCollection: (id) => setActiveCollectionId(id),
      createCollection: async (title: string) => {
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            // Fallback to local storage if not authenticated
            const id = crypto?.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const col: SavedCollection = {
              id,
              title:
                (title || "Untitled Collection").trim() ||
                "Untitled Collection",
              createdAt: new Date().toISOString(),
            };
            setCollections((prev) => [col, ...prev]);
            setCollectionItems((prev) => ({ ...prev, [id]: [] }));
            setActiveCollectionId(id);
            return id;
          }

          // Save to Supabase
          const response = await fetch("/api/collections", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ title }),
          });

          if (response.ok) {
            const { collection } = await response.json();
            setCollections((prev) => [collection, ...prev]);
            setCollectionItems((prev) => ({ ...prev, [collection.id]: [] }));
            setActiveCollectionId(collection.id);
            return collection.id;
          } else {
            throw new Error("Failed to create collection");
          }
        } catch (error) {
          console.error("Error creating collection:", error);
          // Fallback to local storage
          const id = crypto?.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const col: SavedCollection = {
            id,
            title:
              (title || "Untitled Collection").trim() || "Untitled Collection",
            createdAt: new Date().toISOString(),
          };
          setCollections((prev) => [col, ...prev]);
          setCollectionItems((prev) => ({ ...prev, [id]: [] }));
          setActiveCollectionId(id);
          return id;
        }
      },
      addToCollection: async (collectionId: string, item: SavedItem) => {
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            // Fallback to local storage if not authenticated
            setCollectionItems((prev) => {
              const current = prev[collectionId] || [];
              if (current.includes(item.id)) return prev;
              return { ...prev, [collectionId]: [item.id, ...current] };
            });
            // Ensure item exists in global items list for easy lookup
            setItems((prev) =>
              prev.some((it) => it.id === item.id) ? prev : [item, ...prev]
            );
            return;
          }

          // Save to Supabase
          console.log("[addToCollection] Adding item to collection:", {
            collectionId,
            item,
          });
          const response = await fetch(
            `/api/collections/${collectionId}/items`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ item }),
            }
          );

          console.log("[addToCollection] Response status:", response.status);

          if (response.ok) {
            const { item: savedItem } = await response.json();
            console.log(
              "[addToCollection] Successfully saved item:",
              savedItem
            );
            setCollectionItems((prev) => {
              const current = prev[collectionId] || [];
              if (current.includes(item.id)) return prev;
              return { ...prev, [collectionId]: [item.id, ...current] };
            });
            // Ensure item exists in global items list for easy lookup
            setItems((prev) =>
              prev.some((it) => it.id === item.id) ? prev : [item, ...prev]
            );
          } else {
            const errorText = await response.text();
            console.error(
              "[addToCollection] API error:",
              response.status,
              errorText
            );
            throw new Error(
              `Failed to add item to collection: ${response.status} ${errorText}`
            );
          }
        } catch (error) {
          console.error("Error adding item to collection:", error);
          // Fallback to local storage
          setCollectionItems((prev) => {
            const current = prev[collectionId] || [];
            if (current.includes(item.id)) return prev;
            return { ...prev, [collectionId]: [item.id, ...current] };
          });
          setItems((prev) =>
            prev.some((it) => it.id === item.id) ? prev : [item, ...prev]
          );
        }
      },
      removeFromCollection: async (collectionId: string, itemId: string) => {
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            // Fallback to local storage if not authenticated
            setCollectionItems((prev) => {
              const current = prev[collectionId] || [];
              return {
                ...prev,
                [collectionId]: current.filter((id) => id !== itemId),
              };
            });
            return;
          }

          // Remove from Supabase
          const response = await fetch(
            `/api/collections/${collectionId}/items`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ itemId }),
            }
          );

          if (response.ok) {
            setCollectionItems((prev) => {
              const current = prev[collectionId] || [];
              return {
                ...prev,
                [collectionId]: current.filter((id) => id !== itemId),
              };
            });
          } else {
            throw new Error("Failed to remove item from collection");
          }
        } catch (error) {
          console.error("Error removing item from collection:", error);
          // Fallback to local storage
          setCollectionItems((prev) => {
            const current = prev[collectionId] || [];
            return {
              ...prev,
              [collectionId]: current.filter((id) => id !== itemId),
            };
          });
        }
      },
      getActiveCollectionItems: () => {
        if (!activeCollectionId) return [];
        const itemIds = collectionItems[activeCollectionId] || [];
        return items.filter((item) => itemIds.includes(item.id));
      },
    }),
    [items, collections, activeCollectionId, collectionItems]
  );

  return <SavedContext.Provider value={api}>{children}</SavedContext.Provider>;
}

export function useSavedResults() {
  const ctx = useContext(SavedContext);
  if (!ctx)
    throw new Error("useSavedResults must be used within SavedResultsProvider");
  return ctx;
}
