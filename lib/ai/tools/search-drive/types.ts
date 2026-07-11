import type { ToolResult } from "../ai-tools.types";

export interface SearchDriveToolResult extends ToolResult {
  data?: {
    files: Array<{
      id: string;
      name: string;
      mimeType: string;
      modifiedTime?: string;
      webViewLink?: string;
      size?: string;
    }>;
  };
}
