import { eq } from "drizzle-orm";

import type { UserContext } from "@/lib/ai/roles/types";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import { toAppRole } from "./user-role";

export async function getUserById(userId: string): Promise<UserContext | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: toAppRole(user.role),
  };
}
