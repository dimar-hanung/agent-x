import { z } from "zod";

export const listCalendarEventsInputSchema = z.object({
  time_min: z
    .string()
    .optional()
    .describe(
      "ISO datetime lower bound (inclusive). Omit to use start of today Asia/Jakarta."
    ),
  time_max: z
    .string()
    .optional()
    .describe(
      "ISO datetime upper bound (exclusive). Omit to use 7 days after time_min."
    ),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(25)
    .optional()
    .describe("Max events to return (default 10, max 25)."),
  query: z
    .string()
    .optional()
    .describe("Free-text search across event fields."),
});

export type ListCalendarEventsInput = z.infer<
  typeof listCalendarEventsInputSchema
>;
