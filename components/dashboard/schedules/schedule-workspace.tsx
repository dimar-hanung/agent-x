"use client";

import { CalendarClockIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appRoutes } from "@/lib/site-config";
import {
  formatCronExpressionDisplay,
  formatNextRunAt,
  formatScheduleKind,
  formatScheduleStatus,
  type ScheduleCronDisplayMode,
} from "@/lib/scheduler/format-schedule";
import { cn } from "@/lib/utils";

import {
  SCHEDULE_STATUS_COLORS,
  SCHEDULE_STATUS_FILTERS,
  type ScheduleListItem,
  type ScheduleStatusFilter,
} from "@/lib/scheduler/schedule-list-types";

interface ScheduleWorkspaceProps {
  initialSchedules: ScheduleListItem[];
}

export function ScheduleWorkspace({ initialSchedules }: ScheduleWorkspaceProps) {
  const router = useRouter();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [filter, setFilter] = useState<ScheduleStatusFilter>("all");
  const [cronDisplay, setCronDisplay] =
    useState<ScheduleCronDisplayMode>("friendly");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return schedules;
    }
    return schedules.filter((s) => s.status === filter);
  }, [schedules, filter]);

  async function patchAction(id: string, action: "pause" | "resume") {
    setBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        schedule?: { id: string; status: ScheduleListItem["status"]; nextRunAt: string | null };
      } | null;

      if (!response.ok) {
        setError(data?.message ?? "Gagal memperbarui otomatisasi.");
        return;
      }

      if (data?.schedule) {
        setSchedules((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: data.schedule!.status,
                  nextRunAt: data.schedule!.nextRunAt,
                }
              : item
          )
        );
      }

      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Batalkan otomatisasi ini?")) {
      return;
    }

    setBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        setError(data?.message ?? "Gagal membatalkan otomatisasi.");
        return;
      }

      setSchedules((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "cancelled" as const, nextRunAt: null } : item
        )
      );
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_STATUS_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={filter === item.value ? "default" : "outline"}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div
          className="bg-card flex items-center gap-1 rounded-md border p-1"
          role="group"
          aria-label="Format jadwal"
        >
          <Button
            type="button"
            size="sm"
            variant={cronDisplay === "friendly" ? "secondary" : "ghost"}
            onClick={() => setCronDisplay("friendly")}
            aria-pressed={cronDisplay === "friendly"}
          >
            Mudah dibaca
          </Button>
          <Button
            type="button"
            size="sm"
            variant={cronDisplay === "cron" ? "secondary" : "ghost"}
            onClick={() => setCronDisplay("cron")}
            aria-pressed={cronDisplay === "cron"}
          >
            Cron
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {schedules.length === 0 ? (
        <DashboardEmptyState
          icon={<CalendarClockIcon aria-hidden />}
          title="Belum ada otomatisasi"
          description='Minta asisten membuat jadwal berulang di Chat, misalnya "Ingatkan saya setiap Senin pagi".'
          action={{ label: "Buka Chat", href: appRoutes.chat }}
        />
      ) : filtered.length === 0 ? (
        <DashboardEmptyState
          icon={<SearchIcon aria-hidden />}
          title="Tidak ada otomatisasi dengan filter ini"
          description="Pilih filter lain atau tampilkan semua status."
          action={{ label: "Tampilkan semua", onClick: () => setFilter("all") }}
        />
      ) : (
        <div className="surface-panel overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead className="w-[100px]">Jenis</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[160px]">Jalankan berikutnya</TableHead>
                <TableHead className="w-[80px]">Run</TableHead>
                <TableHead className="w-[200px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((schedule) => {
                const busy = busyId === schedule.id;
                const nextLabel = schedule.nextRunAt
                  ? formatNextRunAt(
                      new Date(schedule.nextRunAt),
                      schedule.timezone
                    )
                  : "—";

                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium">{schedule.title}</p>
                        {schedule.lastError ? (
                          <p className="text-destructive mt-0.5 line-clamp-1 text-xs">
                            {schedule.lastError}
                          </p>
                        ) : schedule.cronExpression ? (
                          <p
                            className={cn(
                              "text-muted-foreground mt-0.5 text-xs",
                              cronDisplay === "cron" && "font-mono"
                            )}
                            title={
                              cronDisplay === "friendly"
                                ? schedule.cronExpression
                                : formatCronExpressionDisplay(
                                    schedule.cronExpression,
                                    "friendly"
                                  )
                            }
                          >
                            {formatCronExpressionDisplay(
                              schedule.cronExpression,
                              cronDisplay
                            )}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatScheduleKind(schedule.scheduleKind)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(SCHEDULE_STATUS_COLORS[schedule.status])}
                      >
                        {formatScheduleStatus(schedule.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {nextLabel}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {schedule.runCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {schedule.status === "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void patchAction(schedule.id, "pause")}
                          >
                            Jeda
                          </Button>
                        ) : null}
                        {schedule.status === "paused" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void patchAction(schedule.id, "resume")}
                          >
                            Lanjut
                          </Button>
                        ) : null}
                        {schedule.status === "active" ||
                        schedule.status === "paused" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            disabled={busy}
                            onClick={() => void handleCancel(schedule.id)}
                          >
                            Batal
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
