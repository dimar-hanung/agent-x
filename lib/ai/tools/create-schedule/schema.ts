import { z } from "zod";

export const createScheduleInputSchema = z.object({
  title: z.string().min(1).describe("Short label for the schedule."),
  prompt: z
    .string()
    .min(1)
    .describe(
      "Instruction for the AI to execute when the schedule fires. Output is sent via WhatsApp — use WhatsApp formatting (*bold*, _italic_, lists), not Markdown. URLs must be plain text, not [label](url) links.",
    ),
  schedule_kind: z
    .enum(["cron", "once"])
    .describe("Use 'once' for one-time runs, 'cron' for recurring schedules."),
  cron_expression: z
    .string()
    .optional()
    .describe("5-field cron expression, e.g. '0 9 * * *' for daily at 09:00."),
  timezone: z
    .string()
    .optional()
    .describe('IANA timezone, e.g. "Asia/Jakarta". Defaults to Asia/Jakarta.'),
  run_at: z
    .string()
    .optional()
    .describe("ISO 8601 datetime for one-time schedules."),
});

export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;
