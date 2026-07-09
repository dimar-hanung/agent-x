import type { TodoListItem } from "@/lib/todos/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface UpdateTodoToolResult extends ToolResult {
  data?: {
    todo: TodoListItem;
  };
}
