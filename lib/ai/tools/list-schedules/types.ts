import type { ToolResult } from "../ai-tools.types";

export interface ListSchedulesToolResult extends ToolResult {
  data?: {
    schedules: Array<{
      id: string;
      title: string;
      scheduleKind: "cron" | "once";
      status: string;
      nextRunAt: string | null;
      nextRunAtLabel: string | null;
      runCount: number;
    }>;
  };
}
