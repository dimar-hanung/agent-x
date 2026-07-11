import type { TodoListItem } from "@/lib/todos/schemas";

import type { ToolResult } from "../ai-tools.types";

export interface ListTodosToolResult extends ToolResult {
  data?: {
    todos: TodoListItem[];
  };
}
