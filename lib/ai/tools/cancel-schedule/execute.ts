import type { UserContext } from "@/lib/ai/roles/types";
import { cancelScheduledJob } from "@/lib/db/repositories/schedule-repository";

import type { CancelScheduleInput } from "./schema";
import type { CancelScheduleToolResult } from "./types";

export async function executeCancelSchedule(
  input: CancelScheduleInput,
  ctx: { user: UserContext }
): Promise<CancelScheduleToolResult> {
  const cancelled = await cancelScheduledJob(input.job_id, ctx.user.userId);

  if (!cancelled) {
    return {
      success: false,
      message: "Jadwal tidak ditemukan atau sudah tidak aktif.",
    };
  }

  return {
    success: true,
    data: { jobId: input.job_id },
  };
}
