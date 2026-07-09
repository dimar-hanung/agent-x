import type { ToolResult } from "../ai-tools.types";

export interface SearchInboxToolResult extends ToolResult {
  data?: {
    messages: Array<{
      id: string;
      threadId: string;
      from: string;
      subject: string;
      date: string;
      snippet: string;
    }>;
  };
}
