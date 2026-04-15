import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContentProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  headerBottomAction?: ReactNode;
}

export function PageContent({
  title,
  description,
  children,
  className,
  headerAction,
  headerBottomAction,
}: PageContentProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div
          className={cn("flex flex-col gap-4 py-4 md:gap-6 md:py-6", className)}
        >
          <div className="px-4 lg:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div>
                <h1 className="text-2xl font-semibold">{title}</h1>
                {description ? (
                  <p className="text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {headerAction && <div className="shrink-0">{headerAction}</div>}
            </div>
            {headerBottomAction ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {headerBottomAction}
              </div>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
