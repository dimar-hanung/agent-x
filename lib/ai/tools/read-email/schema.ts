import { z } from "zod";

export const readEmailInputSchema = z.object({
  message_id: z
    .string()
    .min(1)
    .describe("Gmail message id from search_inbox."),
});

export type ReadEmailInput = z.infer<typeof readEmailInputSchema>;
