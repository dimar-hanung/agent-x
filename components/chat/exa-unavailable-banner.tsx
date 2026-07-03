"use client";

import { AlertCircle, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface ExaUnavailableBannerProps {
  className?: string;
}

export function ExaUnavailableBanner({ className }: ExaUnavailableBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-amber-500/10 text-amber-950 dark:text-amber-100 mb-2 flex items-start gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-sm",
        className
      )}
      role="status"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1">
        Pencarian web tidak tersedia. Tambahkan{" "}
        <code className="rounded bg-amber-500/15 px-1 py-0.5 text-xs">
          EXA_API_KEY
        </code>{" "}
        di environment server.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 shrink-0 rounded p-0.5"
        aria-label="Tutup peringatan"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
