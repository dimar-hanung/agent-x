import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1, "Nama wajib diisi.").max(255).optional(),
    email: z.string().trim().email("Format email tidak valid.").optional(),
  })
  .refine(
    (data) => data.displayName !== undefined || data.email !== undefined,
    { message: "Minimal satu field harus diisi." }
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
