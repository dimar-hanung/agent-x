import { z } from "zod";

export const summarizeWhatsappDigestInputSchema = z.object({
  since: z
    .string()
    .trim()
    .optional()
    .describe("Optional ISO datetime — include chats active since this time."),
});

export type SummarizeWhatsappDigestInput = z.infer<
  typeof summarizeWhatsappDigestInputSchema
>;
