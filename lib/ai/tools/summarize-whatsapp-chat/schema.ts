import { z } from "zod";

export const summarizeWhatsappChatInputSchema = z.object({
  chat_name_or_jid: z
    .string()
    .trim()
    .min(1)
    .describe("Chat display name or remote JID to summarize."),
  since: z
    .string()
    .trim()
    .optional()
    .describe("Optional ISO datetime — summarize messages since this time."),
});

export type SummarizeWhatsappChatInput = z.infer<
  typeof summarizeWhatsappChatInputSchema
>;
