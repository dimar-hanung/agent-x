import { z } from "zod";

const messagePartSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

const uiMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(messagePartSchema).min(1),
});

export const chatRequestSchema = z.object({
  id: z.string().uuid(),
  message: uiMessageSchema,
  fileId: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
