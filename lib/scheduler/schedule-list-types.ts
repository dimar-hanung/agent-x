import type { ScheduleStatus } from "@/lib/db/repositories/schedule-repository";

export interface ScheduleListItem {
  id: string;
  title: string;
  prompt: string;
  scheduleKind: "cron" | "once";
  status: ScheduleStatus;
  cronExpression: string | null;
  timezone: string;
  runAt: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  runCount: number;
  createdAt: string;
}

export const SCHEDULE_STATUS_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "paused", label: "Dijeda" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
] as const;

export type ScheduleStatusFilter =
  (typeof SCHEDULE_STATUS_FILTERS)[number]["value"];

export const SCHEDULE_STATUS_COLORS: Record<
  ScheduleStatus,
  string
> = {
  active:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  paused:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  completed:
    "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  cancelled:
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
};
