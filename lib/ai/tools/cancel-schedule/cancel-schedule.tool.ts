import { tool } from "ai";
import { z } from "zod";

import type { UserContext } from "@/lib/ai/roles/types";
import { cancelScheduledJob } from "@/lib/db/repositories/schedule-repository";

import type { CancelScheduleToolResult } from "../ai-tools.types";

export function createCancelScheduleTool(user: UserContext) {
  return tool({
    description: "Cancel an active scheduled job for the current user.",
    inputSchema: z.object({
      job_id: z.string().uuid().describe("The scheduled job ID to cancel."),
    }),
    execute: async ({ job_id }): Promise<CancelScheduleToolResult> => {
      const cancelled = await cancelScheduledJob(job_id, user.userId);

      if (!cancelled) {
        return {
          success: false,
          message: "Jadwal tidak ditemukan atau sudah tidak aktif.",
        };
      }

      return {
        success: true,
        data: { jobId: job_id },
      };
    },
  });
}
