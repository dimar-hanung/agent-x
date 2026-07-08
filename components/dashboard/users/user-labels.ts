"use client";

import type { AdminUserRole } from "@/lib/admin/users/schemas";
import type { UserGender } from "@/lib/db/schema";

export interface UserFormValues {
  displayName: string;
  email: string;
  role: AdminUserRole;
  phone: string;
  gender: UserGender;
}

export const EMPTY_USER_FORM: UserFormValues = {
  displayName: "",
  email: "",
  role: "client",
  phone: "",
  gender: "laki_laki",
};

export function formatGenderLabel(gender: UserGender): string {
  return gender === "laki_laki" ? "Laki-laki" : "Perempuan";
}

export function formatRoleLabel(role: string): string {
  if (role === "admin") return "Admin";
  if (role === "guest") return "Guest";
  if (role === "client") return "Client";
  return role;
}

export function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
