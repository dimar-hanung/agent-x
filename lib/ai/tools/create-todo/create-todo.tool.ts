import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeCreateTodo } from "./execute";
import { createTodoInputSchema } from "./schema";

export function createCreateTodoTool(user: UserContext) {
  return tool({
    description:
      "Create a well-written todo for the current user. Title is required; description, project, status, and tags are optional. Follow good task-writing: imperative title (action + object + short context, ~8–12 words), description with enough context to start without asking, 3–6 testable acceptance criteria, explicit out of scope, outcome-focused (do not over-prescribe solution unless a technical constraint is required). Prefer Bahasa Indonesia for title/description unless the user writes in English.",
    inputSchema: createTodoInputSchema,
    execute: (input) => executeCreateTodo(input, { user }),
  });
}
