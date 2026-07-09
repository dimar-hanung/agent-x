import type { ToolResult } from "../ai-tools.types";

export interface CancelScheduleToolResult extends ToolResult {
  data?: { jobId: string };
}
