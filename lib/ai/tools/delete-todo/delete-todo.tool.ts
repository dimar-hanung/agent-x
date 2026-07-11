import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeDeleteTodo } from "./execute";
import { deleteTodoInputSchema } from "./schema";

export function createDeleteTodoTool(user: UserContext) {
  return tool({
    description:
      "Permanently delete a todo by UUID id or by code (e.g. TODO-1).",
    inputSchema: deleteTodoInputSchema,
    execute: (input) => executeDeleteTodo(input, { user }),
  });
}
