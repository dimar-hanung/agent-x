import type { ToolResult } from "../ai-tools.types";

export interface ReadEmailToolResult extends ToolResult {
  data?: {
    id: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    textBody: string;
    htmlBody?: string;
  };
}
