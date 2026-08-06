import { z } from "zod";

export const listWhatsappGroupsInputSchema = z.object({
  query: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe("Optional group name/JID filter (ILIKE)."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max rows to return (default 50, max 100)."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Skip this many rows for pagination (default 0)."),
});

export type ListWhatsappGroupsInput = z.infer<
  typeof listWhatsappGroupsInputSchema
>;
