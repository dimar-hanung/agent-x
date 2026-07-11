import type { TodoListItem } from "@/lib/todos/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface GetTodoToolResult extends ToolResult {
  data?: {
    todo: TodoListItem;
  };
}
