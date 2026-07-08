import type { ToolResult } from "../ai-tools.types";

export interface SendEmailToolResult extends ToolResult {
  data?: { messageId: string; to: string; sentBy: string };
}
