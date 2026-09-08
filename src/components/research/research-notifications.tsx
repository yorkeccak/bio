"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import { apiListReports } from "@/lib/report-client";
import { isTerminal } from "@/lib/reports";
import {
  fireCompletionNotification,
  requestNotifyPermission,
  seedSeenIfFirst,
  getSeenIds,
} from "./report-notify";

type ToastItem = { id: string; title: string; description?: string };

function ToastHost({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="fixed right-4 top-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-lg"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">{t.title}</div>
            {t.description ? (
              <div className="text-xs text-muted-foreground">
                {t.description}
              </div>
            ) : null}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ResearchNotifications() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", "history"],
    queryFn: apiListReports,
    refetchInterval: 10000,
  });

  useEffect(() => {
    void requestNotifyPermission();
  }, []);

  useEffect(() => {
    if (!seededRef.current) {
      seedSeenIfFirst(
        reports.filter((r) => isTerminal(r.status)).map((r) => r.id),
      );
      seededRef.current = true;
    }
  }, [reports]);

  useEffect(() => {
    const seen = new Set(getSeenIds());
    for (const report of reports) {
      const terminal = isTerminal(report.status);
      const prevStatus = previousStatusRef.current.get(report.id);
      if (
        terminal &&
        prevStatus &&
        !isTerminal(prevStatus) &&
        !seen.has(report.id)
      ) {
        setToasts((curr) => [
          {
            id: report.id,
            title: "Research completed",
            description: report.title || "Deep Research run",
          },
          ...curr.filter((t) => t.id !== report.id),
        ]);
        fireCompletionNotification(report);
      }
      previousStatusRef.current.set(report.id, report.status);
    }
  }, [reports]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(
        () => setToasts((curr) => curr.filter((x) => x.id !== t.id)),
        5000,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <ToastHost
      toasts={toasts}
      dismiss={(id) => setToasts((curr) => curr.filter((t) => t.id !== id))}
    />
  );
}
