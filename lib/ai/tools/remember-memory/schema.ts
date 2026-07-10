import { z } from "zod";

import { MEMORY_CONTENT_MAX_LENGTH } from "@/lib/db/schema";

export const rememberMemoryInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(MEMORY_CONTENT_MAX_LENGTH)
    .describe(
      "Short durable user preference to remember (e.g. prefers Bahasa Indonesia, timezone Asia/Jakarta)."
    ),
});

export type RememberMemoryInput = z.infer<typeof rememberMemoryInputSchema>;
