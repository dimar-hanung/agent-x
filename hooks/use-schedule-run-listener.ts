"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
  requestScheduleNotificationPermission,
  showScheduleCompleteNotification,
} from "@/lib/notifications/schedule-complete-notification";
import { dispatchScheduleRunComplete } from "@/lib/scheduler/schedule-run-events";

const POLL_INTERVAL_MS = 10_000;

interface WatchSchedule {
  id: string;
  title: string;
  status: string;
  scheduleKind: "cron" | "once";
  runCount: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  chatId: string | null;
  lastError: string | null;
}

type ScheduleSnapshot = Record<
  string,
  { runCount: number; lastRunAt: string | null }
>;

function toSnapshot(schedules: WatchSchedule[]): ScheduleSnapshot {
  return Object.fromEntries(
    schedules.map((schedule) => [
      schedule.id,
      {
        runCount: schedule.runCount,
        lastRunAt: schedule.lastRunAt,
      },
    ])
  );
}

function detectNewRuns(
  previous: ScheduleSnapshot | null,
  schedules: WatchSchedule[]
): WatchSchedule[] {
  if (!previous) {
    return [];
  }

  return schedules.filter((schedule) => {
    const prior = previous[schedule.id];

    if (!prior) {
      return schedule.runCount > 0;
    }

    if (schedule.runCount > prior.runCount) {
      return true;
    }

    return (
      schedule.lastRunAt !== null &&
      schedule.lastRunAt !== prior.lastRunAt &&
      schedule.runCount >= prior.runCount
    );
  });
}

export function useScheduleRunListener(enabled = true) {
  const router = useRouter();
  const snapshotRef = React.useRef<ScheduleSnapshot | null>(null);
  const requestedPermissionRef = React.useRef(false);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/schedules/watch", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { schedules: WatchSchedule[] };
        const schedules = body.schedules ?? [];
        const newRuns = detectNewRuns(snapshotRef.current, schedules);

        if (!cancelled && snapshotRef.current && newRuns.length > 0) {
          router.refresh();

          for (const schedule of newRuns) {
            const success = !schedule.lastError;

            dispatchScheduleRunComplete({
              scheduleId: schedule.id,
              title: schedule.title,
              chatId: schedule.chatId,
              success,
              lastError: schedule.lastError,
            });

            showScheduleCompleteNotification({
              title: schedule.title,
              success,
              chatId: schedule.chatId,
            });
          }
        }

        if (
          !cancelled &&
          !requestedPermissionRef.current &&
          schedules.some((schedule) => schedule.status === "active")
        ) {
          requestedPermissionRef.current = true;
          void requestScheduleNotificationPermission();
        }

        if (!cancelled) {
          snapshotRef.current = toSnapshot(schedules);
        }
      } catch {
        // Ignore transient network errors during polling.
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, router]);
}
