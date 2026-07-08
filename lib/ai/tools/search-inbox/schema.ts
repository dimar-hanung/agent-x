import { z } from "zod";

export const searchInboxInputSchema = z.object({
  from: z.string().optional().describe("Filter by sender email or name."),
  subject: z
    .string()
    .optional()
    .describe("Filter by subject containing this text."),
  unread: z.boolean().optional().describe("Only return unread messages."),
  since: z
    .string()
    .optional()
    .describe("Only messages since this ISO date string."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .optional()
    .describe("Max messages to return (default 10, max 25)."),
});

export type SearchInboxInput = z.infer<typeof searchInboxInputSchema>;
