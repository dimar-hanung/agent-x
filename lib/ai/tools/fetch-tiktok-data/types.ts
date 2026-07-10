import type { ApifyToolData } from "@/lib/ai/apify/types";

import type { ToolResult } from "../ai-tools.types";

export interface FetchTikTokDataToolResult extends ToolResult {
  data?: ApifyToolData;
}