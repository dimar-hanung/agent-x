import { z } from "zod";

export const searchDriveInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Search text matched against file names."),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(25)
    .optional()
    .describe("Max files to return (default 10, max 25)."),
});

export type SearchDriveInput = z.infer<typeof searchDriveInputSchema>;
