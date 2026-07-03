import { tool } from "ai";
import { z } from "zod";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";
import { createScheduledJob } from "@/lib/db/repositories/schedule-repository";
import { formatNextRunAt } from "@/lib/scheduler/format-schedule";

import type { CreateScheduleToolResult } from "../ai-tools.types";

export function createCreateScheduleTool(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext
) {
  return tool({
    description:
      "Create a scheduled job that runs an AI prompt at a specific time or on a cron schedule.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Short label for the schedule."),
      prompt: z
        .string()
        .min(1)
        .describe("Instruction for the AI to execute when the schedule fires."),
      schedule_kind: z
        .enum(["cron", "once"])
        .describe("Use 'once' for one-time runs, 'cron' for recurring schedules."),
      cron_expression: z
        .string()
        .optional()
        .describe("5-field cron expression, e.g. '0 9 * * *' for daily at 09:00."),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone, e.g. "Asia/Jakarta". Defaults to Asia/Jakarta.'),
      run_at: z
        .string()
        .optional()
        .describe("ISO 8601 datetime for one-time schedules."),
    }),
    execute: async (input): Promise<CreateScheduleToolResult> => {
      try {
        const summary = await createScheduledJob({
          userId: user.userId,
          chatId: runtimeContext?.chatId ?? null,
          title: input.title,
          prompt: input.prompt,
          scheduleKind: input.schedule_kind,
          cronExpression: input.cron_expression,
          timezone: input.timezone,
          runAt: input.run_at ? new Date(input.run_at) : null,
        });

        return {
          success: true,
          data: {
            jobId: summary.id,
            title: summary.title,
            scheduleKind: summary.scheduleKind,
            nextRunAt: summary.nextRunAt?.toISOString() ?? null,
            nextRunAtLabel: summary.nextRunAt
              ? formatNextRunAt(summary.nextRunAt, summary.timezone)
              : null,
          },
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Gagal membuat jadwal.",
        };
      }
    },
  });
}
