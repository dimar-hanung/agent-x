"use client";

import { CalendarClock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  formatNextRunAt,
  formatScheduleKind,
} from "@/lib/scheduler/format-schedule";
import { cn } from "@/lib/utils";

export interface ScheduleListItem {
  id: string;
  title: string;
  scheduleKind: "cron" | "once";
  timezone: string;
  nextRunAt: string | null;
  runCount: number;
}

interface ScheduleListProps {
  schedules: ScheduleListItem[];
}

export function ScheduleList({ schedules }: ScheduleListProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCancel(scheduleId: string) {
    setCancellingId(scheduleId);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Gagal membatalkan otomatisasi.");
      }

      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Gagal membatalkan otomatisasi."
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-col border-t px-2 pt-2">
      <p className="text-muted-foreground px-2 pb-1 text-xs font-medium tracking-wider uppercase">
        Otomatisasi aktif
      </p>

      {error ? (
        <p className="text-destructive px-2 pb-2 text-xs">{error}</p>
      ) : null}

      {schedules.length === 0 ? (
        <p className="text-muted-foreground px-2 py-2 text-sm">
          Belum ada otomatisasi aktif
        </p>
      ) : (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto pb-2">
          {schedules.map((schedule) => {
            const isCancelling = cancellingId === schedule.id;

            return (
              <div
                key={schedule.id}
                className="hover:bg-muted rounded-lg px-3 py-2 text-sm transition-colors"
              >
                <div className="flex items-start gap-2">
                  <CalendarClock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 leading-snug font-medium">
                      {schedule.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {schedule.nextRunAt
                        ? formatNextRunAt(
                            new Date(schedule.nextRunAt),
                            schedule.timezone
                          )
                        : "Waktu belum tersedia"}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase"
                      )}
                    >
                      {formatScheduleKind(schedule.scheduleKind)}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 w-full text-xs"
                  disabled={isCancelling}
                  onClick={() => void handleCancel(schedule.id)}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Membatalkan...
                    </>
                  ) : (
                    "Batal"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
