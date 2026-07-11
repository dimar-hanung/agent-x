import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListTodos } from "./execute";
import { listTodosInputSchema } from "./schema";

export function createListTodosTool(user: UserContext) {
  return tool({
    description:
      "List the current user's todos. Optionally filter by status or project.",
    inputSchema: listTodosInputSchema,
    execute: (input) => executeListTodos(input, { user }),
  });
}
