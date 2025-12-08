"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChatTitleHeaderProps {
  title: string;
  className?: string;
}

export function ChatTitleHeader({ title, className }: ChatTitleHeaderProps) {
  return (
    <h1
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
    >
      {title}
    </h1>
  );
}
