import type { ToolResult } from "../ai-tools.types";

export interface ListCalendarEventsToolResult extends ToolResult {
  data?: {
    events: Array<{
      id: string;
      summary: string;
      description?: string;
      location?: string;
      start: string;
      end: string;
      htmlLink?: string;
      status?: string;
    }>;
  };
}
