import type { MemoryListItem } from "@/lib/memory/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface RememberMemoryToolResult extends ToolResult {
  data?: {
    memory: MemoryListItem;
  };
}
