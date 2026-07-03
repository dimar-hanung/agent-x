import { z } from "zod";

export const connectGmailSchema = z.object({
  email: z.string().email(),
  appPassword: z.string().min(1).max(128),
});
