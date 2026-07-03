import { tool } from "ai";
import { z } from "zod";

import type { UserContext } from "@/lib/ai/roles/types";
import { listScheduledJobsForUser } from "@/lib/db/repositories/schedule-repository";
import { formatNextRunAt } from "@/lib/scheduler/format-schedule";

import type { ListSchedulesToolResult } from "../ai-tools.types";

export function createListSchedulesTool(user: UserContext) {
  return tool({
    description: "List scheduled jobs for the current user.",
    inputSchema: z.object({
      status: z
        .enum(["active", "paused", "completed", "cancelled"])
        .optional()
        .describe("Filter by status. Omit to list all schedules."),
    }),
    execute: async ({ status }): Promise<ListSchedulesToolResult> => {
      const schedules = await listScheduledJobsForUser(user.userId, { status });

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
    },
  });
}
