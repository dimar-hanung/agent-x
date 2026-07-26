import type { ToolResult } from "../ai-tools.types";

export interface ReadMicrosoftEmailToolResult extends ToolResult {
  data?: {
    id: string;
    conversationId: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    textBody: string;
    htmlBody?: string;
  };
}
