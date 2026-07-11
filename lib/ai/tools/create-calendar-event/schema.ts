import { z } from "zod";

export const createCalendarEventInputSchema = z.object({
  summary: z.string().min(1).describe("Event title."),
  description: z.string().optional().describe("Optional event description."),
  location: z.string().optional().describe("Optional event location."),
  start: z
    .string()
    .min(1)
    .describe(
      "Start time as ISO datetime (e.g. 2026-07-10T09:00:00+07:00) or all-day date YYYY-MM-DD."
    ),
  end: z
    .string()
    .min(1)
    .describe(
      "End time as ISO datetime or all-day date YYYY-MM-DD (exclusive for all-day)."
    ),
  time_zone: z
    .string()
    .optional()
    .describe("IANA timezone for timed events. Defaults to Asia/Jakarta."),
  attendees: z
    .array(z.string().email())
    .optional()
    .describe("Optional attendee email addresses."),
});

export type CreateCalendarEventInput = z.infer<
  typeof createCalendarEventInputSchema
>;
