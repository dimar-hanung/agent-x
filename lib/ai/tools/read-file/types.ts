import type { FileListItem } from "@/lib/files/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface ReadFileToolResult extends ToolResult {
  data?: {
    file: FileListItem;
    content?: string;
    truncated?: boolean;
    binary?: boolean;
  };
}
