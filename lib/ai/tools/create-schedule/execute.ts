import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";
import { getOrCreateMainChannel } from "@/lib/db/repositories/channel-repository";
import { createScheduledJob } from "@/lib/db/repositories/schedule-repository";
import { formatNextRunAt } from "@/lib/scheduler/format-schedule";

import type { CreateScheduleInput } from "./schema";
import type { CreateScheduleToolResult } from "./types";

export interface CreateScheduleExecuteContext {
  user: UserContext;
  runtimeContext?: ChatAgentRuntimeContext;
}

export async function executeCreateSchedule(
  input: CreateScheduleInput,
  ctx: CreateScheduleExecuteContext
): Promise<CreateScheduleToolResult> {
  try {
    const chatId = await getOrCreateMainChannel(ctx.user.userId);
    const summary = await createScheduledJob({
      userId: ctx.user.userId,
      chatId,
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
        error instanceof Error ? error.message : "Gagal membuat jadwal.",
    };
  }
}
