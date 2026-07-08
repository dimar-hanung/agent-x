import type { UserContext } from "@/lib/ai/roles/types";

import type { EchoInput } from "./schema";
import type { EchoToolResult } from "./types";

export async function executeEcho(
  input: EchoInput,
  ctx: { user: UserContext }
): Promise<EchoToolResult> {
  return {
    success: true,
    data: {
      echo: input.message,
      greetedAs: ctx.user.displayName,
    },
  };
}
