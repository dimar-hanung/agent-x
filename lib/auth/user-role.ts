import type { AppRole } from "@/lib/ai/roles/types";

export function toAppRole(role: string): AppRole {
  if (role === "admin" || role === "student" || role === "guest") {
    return role;
  }

  return "guest";
}
