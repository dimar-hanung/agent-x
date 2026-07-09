import type { ReactNode } from "react";

import { CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IntegrationStatusTone = "connected" | "muted" | "warning";

const statusToneClasses: Record<IntegrationStatusTone, string> = {
  connected: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  muted: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const statusDotClasses: Record<IntegrationStatusTone, string> = {
  connected: "bg-emerald-500",
  muted: "bg-muted-foreground/50",
  warning: "bg-amber-500",
};

interface IntegrationCardHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  statusTone: IntegrationStatusTone;
  statusLabel: string;
}

export function IntegrationCardHeader({
  icon,
  title,
  description,
  statusTone,
  statusLabel,
}: IntegrationCardHeaderProps) {
  return (
    <div className="flex items-start gap-3 border-b p-4">
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="mt-1 truncate">{description}</CardDescription>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          statusToneClasses[statusTone],
        )}
      >
        <span
          className={cn("size-1.5 rounded-full", statusDotClasses[statusTone])}
        />
        {statusLabel}
      </span>
    </div>
  );
}
