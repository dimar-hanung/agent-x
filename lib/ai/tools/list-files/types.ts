import type { FileListItem } from "@/lib/files/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface ListFilesToolResult extends ToolResult {
  data?: {
    files: FileListItem[];
    parent_id: string | null;
  };
}
