import { z } from "zod";

export const readEmailInputSchema = z.object({
  uid: z.number().int().positive().describe("Message UID from search_inbox."),
});

export type ReadEmailInput = z.infer<typeof readEmailInputSchema>;
