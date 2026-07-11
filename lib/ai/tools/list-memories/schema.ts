import { z } from "zod";

export const listMemoriesInputSchema = z.object({});

export type ListMemoriesInput = z.infer<typeof listMemoriesInputSchema>;
