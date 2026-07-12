import { z } from "zod";

export const fileListItemSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  kind: z.enum(["file", "folder"]),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative(),
  status: z.enum(["pending", "ready"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FileListItem = z.infer<typeof fileListItemSchema>;

export const createFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama folder wajib diisi.")
    .max(255, "Nama folder terlalu panjang."),
  parentId: z.string().uuid().nullable().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const uploadSessionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama file wajib diisi.")
    .max(255, "Nama file terlalu panjang."),
  parentId: z.string().uuid().nullable().optional(),
  mimeType: z.string().trim().max(255).optional(),
  sizeBytes: z
    .number()
    .int()
    .nonnegative("Ukuran file tidak valid.")
    .max(2 * 1024 * 1024 * 1024, "Ukuran file melebihi batas unggah."),
});

export type UploadSessionInput = z.infer<typeof uploadSessionSchema>;

export const confirmUploadSchema = z.object({
  fileId: z.string().uuid(),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const patchFileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama wajib diisi.")
      .max(255, "Nama terlalu panjang.")
      .optional(),
    parentId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.parentId !== undefined, {
    message: "Berikan name atau parentId.",
  });

export type PatchFileInput = z.infer<typeof patchFileSchema>;

export const quotaSchema = z.object({
  usedBytes: z.number().int().nonnegative(),
  limitBytes: z.number().int().positive(),
  percent: z.number().nonnegative(),
});

export type QuotaInfo = z.infer<typeof quotaSchema>;
