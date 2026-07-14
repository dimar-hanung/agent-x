import { z } from "zod";

export const readFileInputSchema = z.object({
  file_id: z
    .string()
    .uuid()
    .describe("AgentX storage file id from list_files."),
});

export type ReadFileInput = z.infer<typeof readFileInputSchema>;
