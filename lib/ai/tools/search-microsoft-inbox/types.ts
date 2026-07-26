import type { ToolResult } from "../ai-tools.types";

export interface SearchMicrosoftInboxToolResult extends ToolResult {
  data?: {
    messages: Array<{
      id: string;
      conversationId: string;
      from: string;
      subject: string;
      date: string;
      snippet: string;
    }>;
  };
}
