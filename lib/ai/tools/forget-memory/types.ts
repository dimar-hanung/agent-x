import type { ToolResult } from "../ai-tools.types";

export interface ForgetMemoryToolResult extends ToolResult {
  data?: {
    id: string;
  };
}
