import { z } from "zod";

export const readMicrosoftEmailInputSchema = z.object({
  message_id: z
    .string()
    .min(1)
    .describe("Outlook message id from search_microsoft_inbox."),
});

export type ReadMicrosoftEmailInput = z.infer<
  typeof readMicrosoftEmailInputSchema
>;
