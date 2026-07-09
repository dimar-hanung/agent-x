import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(128, "Nama maksimal 128 karakter."),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export interface ApiKeyListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}
