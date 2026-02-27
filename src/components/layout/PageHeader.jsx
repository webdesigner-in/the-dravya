"use client";

import BackButton from "./BackButton";

export default function PageHeader({ 
  title, 
  description, 
  showBackButton = true,
  backHref,
  backLabel = "Back",
  actions,
  className = ""
}) {
  return (
    <div className={`space-y-3 mb-6 ${className}`}>
      {showBackButton && (
        <BackButton href={backHref} label={backLabel} />
      )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
