import { z } from "zod";

export const listWhatsappContactsInputSchema = z.object({
  query: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe("Optional name/phone/JID filter (ILIKE)."),
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

export type ListWhatsappContactsInput = z.infer<
  typeof listWhatsappContactsInputSchema
>;
