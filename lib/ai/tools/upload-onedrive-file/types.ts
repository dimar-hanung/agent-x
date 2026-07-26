import type { ToolResult } from "../ai-tools.types";

export interface UploadOnedriveFileToolResult extends ToolResult {
  data?: {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    webViewLink?: string;
    size?: string;
  };
}
