import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid registration request.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, displayName } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { message: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      role: "student",
    })
    .returning({ id: users.id });

  await createSession(user.id);

  return NextResponse.json({ message: "Registered successfully." });
}
