import type { ToolResult } from "../ai-tools.types";

export interface ExaWebFetchToolResult extends ToolResult {
  data?: {
    pages: Array<{
      url: string;
      title?: string;
      text: string;
    }>;
  };
}
