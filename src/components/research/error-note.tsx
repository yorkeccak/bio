"use client";

import { AlertCircle } from "lucide-react";

export function ErrorNote({
  message,
  className = "",
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      className={`flex items-start gap-1.5 text-xs text-muted-foreground ${className}`}
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
