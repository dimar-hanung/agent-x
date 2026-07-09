import type { ToolResult } from "../ai-tools.types";

export interface ExaWebSearchToolResult extends ToolResult {
  data?: {
    query: string;
    sources: Array<{
      title: string;
      url: string;
      snippet: string;
      publishedDate?: string;
    }>;
  };
}
