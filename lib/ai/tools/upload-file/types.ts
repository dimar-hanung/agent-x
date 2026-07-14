import type { FileListItem } from "@/lib/files/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface UploadFileToolResult extends ToolResult {
  data?: FileListItem;
}
