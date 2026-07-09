import { z } from "zod";

export const cancelScheduleInputSchema = z.object({
  job_id: z.string().uuid().describe("The scheduled job ID to cancel."),
});

export type CancelScheduleInput = z.infer<typeof cancelScheduleInputSchema>;
