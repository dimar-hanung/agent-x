import { z } from "zod";

import { TODO_STATUSES } from "@/lib/db/schema";

export const createTodoInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .describe(
      'Imperative title: [Verb] [specific thing] [for/in context], ~8–12 words. Good: "Tambah validasi email di form Settings". Bad: "Fix bug", "Update API".'
    ),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .nullable()
    .describe(
      "Markdown description (emoji on headings only). Prefer: ## 📋 Summary (1–2 sentences what+why), ## 🎯 Context, ## ✅ Acceptance Criteria (3–6 pass/fail checkboxes; split if >~8), ## 🚫 Out of Scope, ## 📝 Notes (optional). Tiny todos may use only Summary + Acceptance Criteria."
    ),
  project: z
    .string()
    .trim()
    .max(128)
    .optional()
    .nullable()
    .describe("Optional project name."),
  status: z
    .enum(TODO_STATUSES)
    .optional()
    .describe("Initial status. Defaults to todo."),
  tags: z
    .array(z.string().trim().min(1).max(64))
    .max(20)
    .optional()
    .describe(
      "Optional short lowercase tags (max 20), e.g. bug, docs, mcp, auth, ui."
    ),
});

export type CreateTodoToolInput = z.infer<typeof createTodoInputSchema>;
