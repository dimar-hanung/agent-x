import { and, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import type { UpdateProfileInput } from "./schemas";

export class UserNotFoundError extends Error {
  constructor() {
    super("User tidak ditemukan.");
    this.name = "UserNotFoundError";
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super("Email sudah terdaftar.");
    this.name = "EmailTakenError";
  }
}

export interface UpdatedProfile {
  displayName: string;
  email: string;
}

async function assertEmailAvailable(email: string, excludeUserId: string) {
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.email, normalizedEmail), ne(users.id, excludeUserId))
    )
    .limit(1);

  if (existing) {
    throw new EmailTakenError();
  }
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UpdatedProfile> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new UserNotFoundError();
  }

  const updates: Partial<{
    displayName: string;
    email: string;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (input.displayName !== undefined) {
    updates.displayName = input.displayName;
  }

  if (input.email !== undefined) {
    const email = input.email.toLowerCase();
    await assertEmailAvailable(email, userId);
    updates.email = email;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({
      displayName: users.displayName,
      email: users.email,
    });

  if (!updated) {
    throw new UserNotFoundError();
  }

  return updated;
}
