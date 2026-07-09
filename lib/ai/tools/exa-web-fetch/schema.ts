import { z } from "zod";

export const exaWebFetchInputSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1)
    .describe("URLs to read. Batch multiple URLs in one call."),
  maxCharacters: z
    .number()
    .min(1)
    .optional()
    .describe("Maximum characters to extract per page (default: 3000)."),
});

export type ExaWebFetchInput = z.infer<typeof exaWebFetchInputSchema>;
