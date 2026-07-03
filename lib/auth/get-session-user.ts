import type { UserContext } from "@/lib/ai/roles/types";

import { getUserById } from "./get-user-by-id";
import { getSessionUserId } from "./session";

export async function getSessionUser(): Promise<UserContext | null> {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return getUserById(userId);
}
