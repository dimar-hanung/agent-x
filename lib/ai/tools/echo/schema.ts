import { z } from "zod";

export const echoInputSchema = z.object({
  message: z.string().min(1).describe("The message to echo back."),
});

export type EchoInput = z.infer<typeof echoInputSchema>;
