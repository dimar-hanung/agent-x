import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import { hashPassword, verifyPassword } from "./password";

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("Password saat ini salah.");
    this.name = "InvalidCurrentPasswordError";
  }
}

export class SamePasswordError extends Error {
  constructor() {
    super("Password baru harus berbeda dari password saat ini.");
    this.name = "SamePasswordError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User tidak ditemukan.");
    this.name = "UserNotFoundError";
  }
}

export async function changeUserPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string }
): Promise<void> {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new UserNotFoundError();
  }

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);

  if (!valid) {
    throw new InvalidCurrentPasswordError();
  }

  if (input.currentPassword === input.newPassword) {
    throw new SamePasswordError();
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
