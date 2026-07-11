import { z } from "zod";

import { TODO_STATUSES } from "@/lib/db/schema";

export const listTodosInputSchema = z.object({
  status: z
    .enum(TODO_STATUSES)
    .optional()
    .describe("Filter by status: todo, in_progress, waiting, or done."),
  project: z
    .string()
    .trim()
    .max(128)
    .optional()
    .describe("Filter by exact project name."),
});

export type ListTodosInput = z.infer<typeof listTodosInputSchema>;
