import { z } from "zod";

export const getTimeInputSchema = z.object({
  timezone: z
    .string()
    .optional()
    .describe('IANA timezone, e.g. "Asia/Jakarta". Defaults to UTC.'),
});

export type GetTimeInput = z.infer<typeof getTimeInputSchema>;
