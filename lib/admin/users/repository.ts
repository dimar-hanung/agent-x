import { and, desc, eq, ne } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { getOrCreateMainChannel } from "@/lib/db/repositories/channel-repository";
import { db } from "@/lib/db";
import { users, type UserGender } from "@/lib/db/schema";
import {
  sendWhatsAppToPhone,
} from "@/lib/integrations/whatsapp-channel-repository";
import { normalizePhoneE164 } from "@/lib/integrations/whatsapp/phone";

import { generatePassword } from "./generate-password";
import { buildCreateUserWhatsAppMessage } from "./onboarding-messages";
import type {
  AdminUserListItem,
  CreateAdminUserInput,
  UpdateAdminUserInput,
} from "./schemas";

function toListItem(row: {
  id: string;
  displayName: string;
  email: string;
  role: string;
  whatsappPhoneE164: string | null;
  gender: string;
  createdAt: Date;
}): AdminUserListItem {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    whatsappPhoneE164: row.whatsappPhoneE164,
    gender: row.gender as UserGender,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUsers(): Promise<AdminUserListItem[]> {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      whatsappPhoneE164: users.whatsappPhoneE164,
      gender: users.gender,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return rows.map(toListItem);
}

async function assertEmailAvailable(email: string, excludeUserId?: string) {
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      excludeUserId
        ? and(eq(users.email, normalizedEmail), ne(users.id, excludeUserId))
        : eq(users.email, normalizedEmail)
    )
    .limit(1);

  if (existing) {
    throw new Error("Email sudah terdaftar.");
  }
}

async function assertPhoneAvailable(phoneE164: string, excludeUserId?: string) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      excludeUserId
        ? and(eq(users.whatsappPhoneE164, phoneE164), ne(users.id, excludeUserId))
        : eq(users.whatsappPhoneE164, phoneE164)
    )
    .limit(1);

  if (existing) {
    throw new Error("Nomor WhatsApp sudah terdaftar.");
  }
}

export async function createUserWithWhatsApp(
  input: CreateAdminUserInput
): Promise<AdminUserListItem> {
  const phoneE164 = normalizePhoneE164(input.phone);
  const email = input.email.toLowerCase();

  await assertEmailAvailable(email);
  await assertPhoneAvailable(phoneE164);

  const plainPassword = generatePassword();
  const passwordHash = await hashPassword(plainPassword);

  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      displayName: input.displayName,
      role: input.role,
      whatsappPhoneE164: phoneE164,
      gender: input.gender,
    })
    .returning({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      whatsappPhoneE164: users.whatsappPhoneE164,
      gender: users.gender,
      createdAt: users.createdAt,
    });

  try {
    await getOrCreateMainChannel(created.id);

    const message = buildCreateUserWhatsAppMessage({
      role: input.role,
      email,
      password: plainPassword,
    });

    await sendWhatsAppToPhone(phoneE164, message);
  } catch (error) {
    await db.delete(users).where(eq(users.id, created.id));
    throw error;
  }

  return toListItem(created);
}

export async function updateUser(
  id: string,
  input: UpdateAdminUserInput
): Promise<AdminUserListItem> {
  const [target] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!target) {
    throw new Error("User tidak ditemukan.");
  }

  if (target.role === "admin") {
    throw new Error("User admin tidak dapat diubah.");
  }

  const updates: Partial<{
    displayName: string;
    email: string;
    role: string;
    whatsappPhoneE164: string;
    gender: UserGender;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (input.displayName !== undefined) {
    updates.displayName = input.displayName;
  }

  if (input.email !== undefined) {
    const email = input.email.toLowerCase();
    await assertEmailAvailable(email, id);
    updates.email = email;
  }

  if (input.role !== undefined) {
    updates.role = input.role;
  }

  if (input.phone !== undefined) {
    const phoneE164 = normalizePhoneE164(input.phone);
    await assertPhoneAvailable(phoneE164, id);
    updates.whatsappPhoneE164 = phoneE164;
  }

  if (input.gender !== undefined) {
    updates.gender = input.gender;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      whatsappPhoneE164: users.whatsappPhoneE164,
      gender: users.gender,
      createdAt: users.createdAt,
    });

  if (!updated) {
    throw new Error("User tidak ditemukan.");
  }

  return toListItem(updated);
}

export async function deleteUser(
  id: string,
  actorUserId: string
): Promise<void> {
  if (id === actorUserId) {
    throw new Error("Tidak dapat menghapus akun sendiri.");
  }

  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!target) {
    throw new Error("User tidak ditemukan.");
  }

  if (target.role === "admin") {
    throw new Error("User admin tidak dapat dihapus.");
  }

  await db.delete(users).where(eq(users.id, id));
}
