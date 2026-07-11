import type { ToolResult } from "../ai-tools.types";

export interface CreateScheduleToolResult extends ToolResult {
  data?: {
    jobId: string;
    title: string;
    scheduleKind: "cron";
    nextRunAt: string | null;
    nextRunAtLabel: string | null;
  };
}
