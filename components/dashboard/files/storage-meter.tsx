import { HardDrive } from "lucide-react";

import { formatBytes } from "@/lib/files/format-bytes";
import type { QuotaInfo } from "@/lib/files/schemas";
import { cn } from "@/lib/utils";

interface StorageMeterProps {
  quota: QuotaInfo;
  className?: string;
}

export function StorageMeter({ quota, className }: StorageMeterProps) {
  const usedPct = Math.min(100, quota.percent);
  const isWarning = usedPct >= 90;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5",
        className
      )}
    >
      <HardDrive className="text-muted-foreground size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Kuota penyimpanan</span>
          <span className="tabular-nums">
            {formatBytes(quota.usedBytes)} / {formatBytes(quota.limitBytes)}
          </span>
        </div>
        <div
          className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(usedPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isWarning ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
