"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type ContentLoaderProps = {
  message?: string;
  className?: string;
};

export function ContentLoader({
  message = "Loading...",
  className,
}: ContentLoaderProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="py-10">
        <div
          className="flex flex-col items-center justify-center gap-3 text-center"
          role="status"
          aria-live="polite"
          aria-label={message}
        >
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
          {message ? (
            <p className="text-sm font-medium text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

