"use client";

import { useSavedResults } from "@/lib/saved-result-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { SearchResultCard } from "@/components/chat-interface";
import { Trash2 } from "lucide-react";

type SavedLibraryProps = {
  onClose?: () => void;
  layout?: "panel" | "page";
};

export function SavedLibrary({
  onClose: _onClose,
  layout = "panel",
}: SavedLibraryProps) {
  const saved = useSavedResults();
  const hasCollections = saved.collections.length > 0;
  const activeCollection = saved.collections.find(
    (collection) => collection.id === saved.activeCollectionId
  );

  const containerClass =
    layout === "page" ? "space-y-6" : "p-3 space-y-3 max-w-xs";

  const headerTitleClass =
    layout === "page"
      ? "text-lg font-semibold text-gray-900 dark:text-gray-100"
      : "text-xs font-medium text-gray-600";

  const listWrapperClass =
    layout === "page"
      ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : "flex flex-col gap-2 max-h-80 overflow-y-auto pr-1";

  const cardVariants = {
    hidden: { opacity: 0, y: -24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.45,
        ease: "easeOut" as const,
      },
    }),
  };

  const mappedItems = useMemo(() => {
    const activeCollectionItems = saved.getActiveCollectionItems();
    return activeCollectionItems.map((item) => {
      const data = (item.data as Record<string, any>) || {};
      const fullContent =
        data.fullContent ??
        data.brief_summary ??
        data.content ??
        data.summary ??
        "";

      return {
        ...data,
        id: item.id,
        title:
          typeof data.title === "string" && data.title.trim()
            ? data.title
            : item.title,
        summary:
          data.summary ??
          data.brief_summary ??
          (typeof fullContent === "string" ? fullContent.slice(0, 240) : ""),
        source:
          item.source ??
          data.source ??
          data.metadata?.source ??
          "Unknown source",
        date: item.date ?? data.date ?? data.start_date ?? "",
        url: item.url ?? data.url ?? "",
        fullContent,
        isStructured:
          typeof data.isStructured === "boolean"
            ? data.isStructured
            : data.dataType === "structured",
        dataType: data.dataType ?? item.type ?? "unstructured",
        length:
          data.length ??
          (typeof fullContent === "string" ? fullContent.length : undefined),
        imageUrls: data.imageUrls ?? data.image_url ?? {},
        relevanceScore: data.relevanceScore ?? data.relevance_score ?? 0,
        doi: data.doi ?? data.metadata?.doi,
        authors: data.authors,
        citation: data.citation,
        nctId: data.nctId ?? data.nct_id,
        status: data.status,
        phase: data.phase,
        enrollment: data.enrollment,
        conditions: data.conditions,
        interventions: data.interventions,
      };
    });
  }, [saved.getActiveCollectionItems, saved.activeCollectionId]);

  const hasItems = mappedItems.length > 0;

  return (
    <div
      className={cn(containerClass, layout === "page" ? "w-full" : undefined)}
    >
      <div className="flex items-center justify-between pt-3">
        <div className={headerTitleClass}>Saved Results</div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={layout === "page" ? "text-xs" : "text-[11px]"}
            onClick={() => {
              const title = window.prompt("New collection name");
              if (!title) return;
              void saved.createCollection(title.trim()).catch((error) => {
                console.error("Failed to create collection", error);
              });
            }}
          >
            New
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={layout === "page" ? "text-xs" : "text-[11px]"}
            onClick={() => saved.clear()}
            disabled={!hasItems}
          >
            Clear
          </Button>
          {saved.activeCollectionId && (
            <Button
              size="sm"
              variant="ghost"
              className={
                layout === "page"
                  ? "text-xs text-red-500"
                  : "text-[11px] text-red-500"
              }
              onClick={() => {
                if (!saved.activeCollectionId) return;
                const collection = saved.collections.find(
                  (c) => c.id === saved.activeCollectionId
                );
                const confirmed = window.confirm(
                  collection
                    ? `Delete collection "${collection.title}"? All saved items in it will be removed.`
                    : "Delete this collection?"
                );
                if (!confirmed) return;
                // TODO: Implement deleteCollection function
                console.log(
                  "Delete collection functionality not yet implemented"
                );
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      {hasCollections ? (
        <div className="flex flex-wrap gap-2">
          {saved.collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => saved.setActiveCollection(collection.id)}
              className={cn(
                "text-[11px] px-2 py-1 rounded border transition-colors",
                collection.id === saved.activeCollectionId
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}
            >
              {collection.title}
            </button>
          ))}
        </div>
      ) : null}

      {!hasItems ? (
        <div
          className={cn(
            "border border-dashed border-gray-200 rounded",
            layout === "page"
              ? "p-6 text-sm text-gray-500 dark:text-gray-400"
              : "p-3 text-xs text-gray-500"
          )}
        >
          {hasCollections && activeCollection
            ? `No saved results in “${activeCollection.title}” yet`
            : "No saved results yet"}
        </div>
      ) : (
        <div className={listWrapperClass}>
          {mappedItems.map((mappedItem, index) => {
            const originalItem = saved.getActiveCollectionItems()[index];
            return (
              <motion.div
                key={mappedItem.id}
                className={cn(layout === "page" ? "w-full" : "flex-shrink-0")}
                variants={cardVariants}
                initial={layout === "page" ? "hidden" : undefined}
                animate={layout === "page" ? "visible" : undefined}
                custom={index}
              >
                <SearchResultCard
                  result={mappedItem}
                  type={originalItem?.type ?? "web"}
                  variant="saved"
                  onRemove={() => saved.remove(mappedItem.id)}
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
