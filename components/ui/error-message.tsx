"use client";

import type { ReactNode } from "react";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ErrorMessageProps = {
  /** Inline message. Takes precedence over `error`. */
  children?: React.ReactNode;
  /** Uses `Error.message`, a string as-is, or `fallback` for other values. */
  error?: unknown;
  fallback?: string;
  /** `muted` for secondary detail (e.g. under a bold title). */
  tone?: "destructive" | "muted";
  className?: string;
};

/**
 * Inline error alert for forms, dialogs, charts, and empty states.
 * Renders nothing when there is no `children` and `error` is null/undefined.
 */
export function ErrorMessage({
  children,
  error,
  fallback = "Something went wrong",
  tone = "destructive",
  className,
}: ErrorMessageProps) {
  const resolved: ReactNode =
    children != null
      ? children
      : error != null
        ? error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : fallback
        : null;

  if (resolved == null || resolved === false) return null;
  if (resolved === "") return null;

  const isMuted = tone === "muted";
  const Icon = isMuted ? Info : AlertCircle;

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-2.5 rounded-lg border px-3 py-1.5 text-xs leading-snug shadow-xs",
        "transition-colors",
        isMuted
          ? "border-border/80 bg-muted/50 text-muted-foreground"
          : "border-destructive/25 bg-destructive/[0.06] text-destructive dark:border-destructive/30 dark:bg-destructive/[0.12]",
        className
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 translate-y-px",
          isMuted ? "text-muted-foreground/80" : "text-destructive"
        )}
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0 flex-1">{resolved}</div>
    </div>
  );
}
