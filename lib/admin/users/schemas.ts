import type { UserGender } from "@/lib/db/schema";
import { z } from "zod";

export const adminUserRoles = ["client", "guest"] as const;
export type AdminUserRole = (typeof adminUserRoles)[number];

export const adminUserGenders = ["laki_laki", "perempuan"] as const;

export const createAdminUserSchema = z.object({
  displayName: z.string().trim().min(1, "Nama wajib diisi.").max(255),
  email: z.string().trim().email("Format email tidak valid."),
  role: z.enum(adminUserRoles, {
    error: "Role tidak valid.",
  }),
  phone: z.string().trim().min(8, "Nomor WhatsApp wajib diisi."),
  gender: z.enum(adminUserGenders, {
    error: "Jenis kelamin tidak valid.",
  }),
});

export const updateAdminUserSchema = z
  .object({
    displayName: z.string().trim().min(1, "Nama wajib diisi.").max(255).optional(),
    email: z.string().trim().email("Format email tidak valid.").optional(),
    role: z
      .enum(adminUserRoles, {
        error: "Role tidak valid.",
      })
      .optional(),
    phone: z.string().trim().min(8, "Nomor WhatsApp wajib diisi.").optional(),
    gender: z
      .enum(adminUserGenders, {
        error: "Jenis kelamin tidak valid.",
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.displayName !== undefined ||
      data.email !== undefined ||
      data.role !== undefined ||
      data.phone !== undefined ||
      data.gender !== undefined,
    { message: "Minimal satu field harus diisi." }
  );

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;

export interface AdminUserListItem {
  id: string;
  displayName: string;
  email: string;
  role: string;
  whatsappPhoneE164: string | null;
  gender: UserGender;
  createdAt: string;
}
