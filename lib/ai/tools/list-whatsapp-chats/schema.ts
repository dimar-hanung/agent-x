import { z } from "zod";

export const listWhatsappChatsInputSchema = z.object({});

export type ListWhatsappChatsInput = z.infer<typeof listWhatsappChatsInputSchema>;
