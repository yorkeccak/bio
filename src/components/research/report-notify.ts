/**
 * Client-side helpers for DeepResearch completion notifications.
 */

import type { ReportDTO } from "@/lib/reports";
import { isTerminal } from "@/lib/reports";

const SEEN_KEY = "bio.reports.seenIds";

export function getSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}

export function markSeen(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const set = new Set(getSeenIds());
  ids.forEach((id) => set.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

export function seedSeenIfFirst(terminalIds: string[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEEN_KEY) === null) {
    localStorage.setItem(SEEN_KEY, JSON.stringify(terminalIds));
  }
}

export function unseenCompletedCount(reports: ReportDTO[]): number {
  const seen = new Set(getSeenIds());
  return reports.filter((r) => isTerminal(r.status) && !seen.has(r.id)).length;
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotifyPermission(): Promise<void> {
  if (!notificationsSupported()) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignored */
    }
  }
}

export function canNotify(): boolean {
  return notificationsSupported() && Notification.permission === "granted";
}

export function fireCompletionNotification(report: ReportDTO): void {
  if (!canNotify()) return;
  const failed = report.status === "failed" || report.status === "cancelled";
  try {
    const n = new Notification(
      failed ? "Research didn't finish" : "Your research is ready",
      {
        body: report.title || "DeepResearch run",
        tag: report.id,
        icon: "/valyu.svg",
      },
    );
    n.onclick = () => {
      window.focus();
      window.location.href = `/?research=${report.id}`;
    };
  } catch {
    try {
      new Notification(
        failed ? "Research didn't finish" : "Your research is ready",
        {
          body: report.title || "DeepResearch run",
          tag: report.id,
          icon: "/nabla.png",
        },
      );
    } catch {
      /* ignored */
    }
  }
}
