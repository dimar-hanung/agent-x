import { z } from "zod";

export const deleteTodoInputSchema = z
  .object({
    id: z.string().uuid().optional().describe("Todo UUID to delete."),
    code: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .optional()
      .describe("Todo code such as TODO-1."),
  })
  .refine((data) => Boolean(data.id || data.code), {
    message: "Isi id atau code todo.",
  });

export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;
