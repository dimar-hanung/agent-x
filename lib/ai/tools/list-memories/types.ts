import type { MemoryListItem } from "@/lib/memory/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface ListMemoriesToolResult extends ToolResult {
  data?: {
    memories: MemoryListItem[];
  };
}
