import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type IntegrationStatusTone = "connected" | "muted" | "warning";

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

interface IntegrationRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  statusTone: IntegrationStatusTone;
  statusLabel: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function IntegrationRow({
  icon,
  title,
  description,
  statusTone,
  statusLabel,
  actions,
  children,
}: IntegrationRowProps) {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-tight">{title}</p>
            <p className="text-muted-foreground truncate">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 pl-[52px] sm:pl-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
              statusToneClasses[statusTone],
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", statusDotClasses[statusTone])}
            />
            {statusLabel}
          </span>
          {actions}
        </div>
      </div>
      {children ? <div className="mt-4 pl-[52px]">{children}</div> : null}
    </div>
  );
}
