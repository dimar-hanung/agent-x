import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export class OnboardingNotApplicableError extends Error {
  constructor(message = "Panduan tidak berlaku untuk akun ini.") {
    super(message);
    this.name = "OnboardingNotApplicableError";
  }
}

export async function completeClientOnboarding(userId: string): Promise<Date> {
  const [updated] = await db
    .update(users)
    .set({
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "client"),
        isNull(users.onboardingCompletedAt)
      )
    )
    .returning({ onboardingCompletedAt: users.onboardingCompletedAt });

  if (updated?.onboardingCompletedAt) {
    return updated.onboardingCompletedAt;
  }

  const [existing] = await db
    .select({
      role: users.role,
      onboardingCompletedAt: users.onboardingCompletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing || existing.role !== "client") {
    throw new OnboardingNotApplicableError();
  }

  if (existing.onboardingCompletedAt) {
    return existing.onboardingCompletedAt;
  }

  throw new OnboardingNotApplicableError();
}
