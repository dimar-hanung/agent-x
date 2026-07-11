import { z } from "zod";

export const createScheduleInputSchema = z.object({
  title: z.string().min(1).describe("Short label for the recurring automation."),
  prompt: z
    .string()
    .min(1)
    .describe(
      "Instruction for the AI to execute when the schedule fires. Output is sent via WhatsApp — use WhatsApp formatting (*bold*, _italic_, lists), not Markdown. URLs must be plain text, not [label](url) links.",
    ),
  schedule_kind: z
    .literal("cron")
    .describe(
      "Only recurring automations. For one-time reminders use create_todo with starts_at instead."
    ),
  cron_expression: z
    .string()
    .describe("5-field cron expression, e.g. '0 9 * * *' for daily at 09:00."),
  timezone: z
    .string()
    .optional()
    .describe('IANA timezone, e.g. "Asia/Jakarta". Defaults to Asia/Jakarta.'),
});

export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;
