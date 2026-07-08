import { z } from "zod";

export const listSchedulesInputSchema = z.object({
  status: z
    .enum(["active", "paused", "completed", "cancelled"])
    .optional()
    .describe("Filter by status. Omit to list all schedules."),
});

export type ListSchedulesInput = z.infer<typeof listSchedulesInputSchema>;
