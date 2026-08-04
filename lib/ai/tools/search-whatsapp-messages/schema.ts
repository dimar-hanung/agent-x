import { z } from "zod";

export const searchWhatsappMessagesInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .describe(
      "Natural-language question about what to find in the user's personal WhatsApp inbox."
    ),
  chat_name_or_jid: z
    .string()
    .trim()
    .optional()
    .describe("Optional chat display name, phone digits, or JID to scope search."),
  since: z
    .string()
    .trim()
    .optional()
    .describe("Optional ISO datetime — only search messages since this time."),
});

export type SearchWhatsappMessagesInput = z.infer<
  typeof searchWhatsappMessagesInputSchema
>;
