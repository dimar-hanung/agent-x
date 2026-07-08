import type { UserContext } from "@/lib/ai/roles/types";
import { listScheduledJobsForUser } from "@/lib/db/repositories/schedule-repository";
import { formatNextRunAt } from "@/lib/scheduler/format-schedule";

import type { ListSchedulesInput } from "./schema";
import type { ListSchedulesToolResult } from "./types";

export async function executeListSchedules(
  input: ListSchedulesInput,
  ctx: { user: UserContext }
): Promise<ListSchedulesToolResult> {
  const schedules = await listScheduledJobsForUser(ctx.user.userId, {
    status: input.status,
  });

  return {
    success: true,
    data: {
      schedules: schedules.map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        scheduleKind: schedule.scheduleKind,
        status: schedule.status,
        nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
        nextRunAtLabel: schedule.nextRunAt
          ? formatNextRunAt(schedule.nextRunAt, schedule.timezone)
          : null,
        runCount: schedule.runCount,
      })),
    },
  };
}
