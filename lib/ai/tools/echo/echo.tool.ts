import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeEcho } from "./execute";
import { echoInputSchema } from "./schema";

export function createEchoTool(user: UserContext) {
  return tool({
    description: "Echo back a message, greeting the current user by name.",
    inputSchema: echoInputSchema,
    execute: (input) => executeEcho(input, { user }),
  });
}
