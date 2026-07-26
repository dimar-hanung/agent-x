"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DashboardEmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

export interface DashboardEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: DashboardEmptyStateAction;
  /** panel = primary content area; inline = compact nested area (lists, side panels) */
  variant?: "panel" | "inline";
  className?: string;
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "panel",
  className,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        variant === "panel" &&
          "surface-panel w-full rounded-lg border px-6 py-14",
        variant === "inline" && "w-full px-4 py-8",
        className
      )}
    >
      <div
        className={cn(
          "bg-muted/60 text-muted-foreground flex items-center justify-center rounded-full",
          variant === "panel" ? "size-12" : "size-10"
        )}
        aria-hidden
      >
        <Icon className={variant === "panel" ? "size-6" : "size-5"} />
      </div>

      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {action ? (
        action.href ? (
          <Button asChild disabled={action.disabled}>
            <Link href={action.href} aria-disabled={action.disabled}>
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
