import { z } from "zod";

export const getTodoInputSchema = z
  .object({
    id: z.string().uuid().optional().describe("Todo UUID."),
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

export type GetTodoInput = z.infer<typeof getTodoInputSchema>;
