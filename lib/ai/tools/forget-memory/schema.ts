import { z } from "zod";

export const forgetMemoryInputSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe("Memory UUID to forget. Use list_memories to find ids."),
});

export type ForgetMemoryInput = z.infer<typeof forgetMemoryInputSchema>;
