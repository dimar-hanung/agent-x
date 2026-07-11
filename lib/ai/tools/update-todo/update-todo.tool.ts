import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeUpdateTodo } from "./execute";
import { updateTodoInputSchema } from "./schema";

export function createUpdateTodoTool(user: UserContext) {
  return tool({
    description:
      "Update an existing todo by UUID id or by code (e.g. TODO-1). At least one field besides id/code must be provided. When rewriting title/description, keep good task-writing: imperative title, testable acceptance criteria, out of scope, outcome-focused.",
    inputSchema: updateTodoInputSchema,
    execute: (input) => executeUpdateTodo(input, { user }),
  });
}
