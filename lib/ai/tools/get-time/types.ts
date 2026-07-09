import type { ToolResult } from "../ai-tools.types";

export interface GetTimeToolResult extends ToolResult {
  data?: { iso: string; timezone: string; local: string };
}
