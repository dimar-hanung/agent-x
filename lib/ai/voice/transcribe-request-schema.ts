import { z } from "zod";

export const transcribeRequestSchema = z.object({
  base64: z
    .string()
    .min(1, "Audio kosong.")
    .regex(/^[A-Za-z0-9+/=]+$/, "Data audio tidak valid."),
  mimeType: z.string().min(1, "Tipe audio wajib diisi."),
  byteLength: z
    .number()
    .int("Ukuran audio tidak valid.")
    .positive("Ukuran audio tidak valid."),
  fileName: z.string().optional(),
});

export type TranscribeRequest = z.infer<typeof transcribeRequestSchema>;
