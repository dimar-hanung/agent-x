import type { ToolResult } from "../ai-tools.types";

export interface ReadDriveFileToolResult extends ToolResult {
  data?: {
    id: string;
    name: string;
    mimeType: string;
    content?: string;
    webViewLink?: string;
    unreadableReason?: string;
  };
}
