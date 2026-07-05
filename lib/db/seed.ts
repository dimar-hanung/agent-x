import "@/lib/db/load-env";

import { eq } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { db, sql } from "@/lib/db";
import { ensureMainChannelForUser } from "@/lib/db/repositories/channel-repository";
import { users } from "@/lib/db/schema";

const SEED_USERS = [
  {
    email: "admin@agentx.local",
    password: "admin12345",
    displayName: "Admin User",
    role: "admin",
  },
  {
    email: "student@agentx.local",
    password: "student12345",
    displayName: "Student User",
    role: "student",
  },
] as const;

async function seed() {
  for (const seedUser of SEED_USERS) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, seedUser.email))
      .limit(1);

    if (existing) {
      console.log(`Skip existing user: ${seedUser.email}`);
      continue;
    }

    const passwordHash = await hashPassword(seedUser.password);

    const [user] = await db
      .insert(users)
      .values({
        email: seedUser.email,
        passwordHash,
        displayName: seedUser.displayName,
        role: seedUser.role,
      })
      .returning({ id: users.id });

    await ensureMainChannelForUser(user.id);

    console.log(`Created user: ${seedUser.email}`);
  }

  const allUsers = await db.select({ id: users.id }).from(users);

  for (const user of allUsers) {
    await ensureMainChannelForUser(user.id);
  }
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
