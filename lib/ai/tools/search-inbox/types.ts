import type { ToolResult } from "../ai-tools.types";

export interface SearchInboxToolResult extends ToolResult {
  data?: {
    messages: Array<{
      uid: number;
      from: string;
      subject: string;
      date: string;
      snippet: string;
    }>;
  };
}
