import { z } from "zod";

import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_SOURCES,
} from "@/lib/db/schema";

export const createMemorySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Preference wajib diisi.")
    .max(
      MEMORY_CONTENT_MAX_LENGTH,
      `Preference maksimal ${MEMORY_CONTENT_MAX_LENGTH} karakter.`
    ),
  source: z.enum(MEMORY_SOURCES).optional(),
});

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;

export interface MemoryListItem {
  id: string;
  content: string;
  source: (typeof MEMORY_SOURCES)[number];
  createdAt: string;
  updatedAt: string;
}
