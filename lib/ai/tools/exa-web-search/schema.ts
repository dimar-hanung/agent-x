import { z } from "zod";

export const exaWebSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Natural language search query. Describe the ideal page, not just keywords."
    ),
  numResults: z
    .number()
    .optional()
    .describe("Number of search results to return (default: 10)."),
});

export type ExaWebSearchInput = z.infer<typeof exaWebSearchInputSchema>;
