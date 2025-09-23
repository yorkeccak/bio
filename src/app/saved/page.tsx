"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SavedLibrary } from "@/components/saved-library";
import { SavedResultsProvider } from "@/lib/saved-result-context";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function SavedPageContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chatId");
  const backHref = chatId ? `/?chatId=${chatId}` : "/";

  return (
    <SavedResultsProvider>
      <main className="min-h-screen bg-white dark:bg-gray-950">
        <div className="mx-auto w-full max-w-5xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6 dark:border-gray-800">
            <div>
              <h1 className="text-2xl py-3 font-semibold text-gray-900 dark:text-gray-100">
                Saved Results
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organize and revisit the answers you&apos;ve bookmarked across
                your collections.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" /> Back to chat
              </Link>
            </Button>
          </div>

          <SavedLibrary layout="page" />
        </div>
      </main>
    </SavedResultsProvider>
  );
}

export default function SavedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SavedPageContent />
    </Suspense>
  );
}
