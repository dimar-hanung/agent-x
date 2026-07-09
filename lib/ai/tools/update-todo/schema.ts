import { z } from "zod";

import { TODO_STATUSES } from "@/lib/db/schema";

export const updateTodoInputSchema = z
  .object({
    id: z.string().uuid().optional().describe("Todo UUID to update."),
    code: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .optional()
      .describe("Todo code such as TODO-1."),
    title: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'Imperative title: [Verb] [specific thing] [for/in context], ~8–12 words. Avoid vague titles like "Fix bug".'
      ),
    description: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .nullable()
      .describe(
        "Markdown description with Summary, Context, Acceptance Criteria (3–6 testable items), Out of Scope, optional Notes. Emoji on headings only."
      ),
    project: z.string().trim().max(128).optional().nullable(),
    status: z.enum(TODO_STATUSES).optional(),
    tags: z
      .array(z.string().trim().min(1).max(64))
      .max(20)
      .optional()
      .describe("Short lowercase tags, e.g. bug, docs, mcp, auth, ui."),
    position: z.number().int().min(0).optional(),
  })
  .refine((data) => Boolean(data.id || data.code), {
    message: "Isi id atau code todo.",
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.project !== undefined ||
      data.status !== undefined ||
      data.tags !== undefined ||
      data.position !== undefined,
    { message: "Minimal satu field harus diisi." }
  );

export type UpdateTodoToolInput = z.infer<typeof updateTodoInputSchema>;
