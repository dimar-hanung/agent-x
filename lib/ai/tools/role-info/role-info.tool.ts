import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeRoleInfo } from "./execute";
import { roleInfoInputSchema } from "./schema";

export function createRoleInfoTool(user: UserContext) {
  return tool({
    description:
      "Return the current user identity and which tools are available for their role.",
    inputSchema: roleInfoInputSchema,
    execute: (input) => executeRoleInfo(input, { user }),
  });
}
