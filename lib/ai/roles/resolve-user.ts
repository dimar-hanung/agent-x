import { getSessionUser } from "@/lib/auth/get-session-user";
import type { UserContext } from "@/lib/ai/roles/types";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function resolveUser(): Promise<UserContext> {
  const user = await getSessionUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}
