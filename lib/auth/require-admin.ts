import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";

export async function requireAdminUser() {
  const user = await getSessionUser();

  if (!user) {
    return { error: NextResponse.json({ message: "Unauthorized." }, { status: 401 }) };
  }

  if (user.role !== "admin") {
    return { error: NextResponse.json({ message: "Forbidden." }, { status: 403 }) };
  }

  return { user };
}
