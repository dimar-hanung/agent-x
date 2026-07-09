import type { ToolResult } from "../ai-tools.types";

export interface CreateCalendarEventToolResult extends ToolResult {
  data?: {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    htmlLink?: string;
    status?: string;
  };
}
