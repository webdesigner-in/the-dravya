"use client";

import BackButton from "./BackButton";
import { Badge } from "@/components/ui/badge";

export default function PageHeader({ 
  title, 
  description, 
  showBackButton = true,
  backHref,
  backLabel = "Back",
  actions,
  badge,
  className = ""
}) {
  return (
    <div className={`space-y-2 mb-4 sm:space-y-2.5 sm:mb-5 md:mb-6 ${className}`}>
      {showBackButton && (
        <BackButton href={backHref} label={backLabel} />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="min-w-0 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl break-words">
              {title}
            </h1>
            {badge && badge}
          </div>
          {description && (
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm md:text-base sm:mt-2">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
