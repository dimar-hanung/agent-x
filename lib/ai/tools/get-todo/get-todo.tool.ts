import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeGetTodo } from "./execute";
import { getTodoInputSchema } from "./schema";

export function createGetTodoTool(user: UserContext) {
  return tool({
    description:
      "Get a single todo by UUID id or by code (e.g. TODO-1). Provide id or code.",
    inputSchema: getTodoInputSchema,
    execute: (input) => executeGetTodo(input, { user }),
  });
}
