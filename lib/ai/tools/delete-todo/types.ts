import type { ToolResult } from "../ai-tools.types";

export interface DeleteTodoToolResult extends ToolResult {
  data?: {
    id: string;
    code: string;
  };
}
