import { ScheduleWorkspace } from "@/components/dashboard/schedules/schedule-workspace";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { listScheduledJobsForUser } from "@/lib/db/repositories/schedule-repository";
import type { ScheduleListItem } from "@/lib/scheduler/schedule-list-types";

export default async function SchedulesPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const rows = await listScheduledJobsForUser(user.userId, {
    scheduleKind: "cron",
  });
  const schedules: ScheduleListItem[] = rows.map((schedule) => ({
    id: schedule.id,
    title: schedule.title,
    prompt: schedule.prompt,
    scheduleKind: schedule.scheduleKind,
    status: schedule.status,
    cronExpression: schedule.cronExpression,
    timezone: schedule.timezone,
    runAt: schedule.runAt?.toISOString() ?? null,
    nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    lastError: schedule.lastError,
    runCount: schedule.runCount,
    createdAt: schedule.createdAt.toISOString(),
  }));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Otomatisasi</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Otomatisasi</h1>
          <p className="text-muted-foreground text-sm">
            Kelola otomatisasi berulang. Buat lewat Chat. Pengingat sekali pakai
            Todo.
          </p>
        </div>
        <ScheduleWorkspace initialSchedules={schedules} />
      </div>
    </>
  );
}
