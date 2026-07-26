import type { ToolResult } from "../ai-tools.types";

export interface SendMicrosoftEmailToolResult extends ToolResult {
  data?: { messageId: string; to: string; sentBy: string };
}
