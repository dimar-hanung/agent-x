import { z } from "zod";

export const askFileInputSchema = z.object({
  file_id: z
    .string()
    .uuid()
    .describe("AgentX storage file id from list_files or WhatsApp attachment stub."),
  query: z
    .string()
    .min(1)
    .describe("User question about the document content."),
});

export type AskFileInput = z.infer<typeof askFileInputSchema>;
