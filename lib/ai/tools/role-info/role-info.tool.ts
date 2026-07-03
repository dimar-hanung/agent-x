import { tool } from "ai";
import { z } from "zod";

import {
  getMcpToolKeysForRole,
  getNativeToolKeysForRole,
  getToolKeysForRole,
} from "@/lib/ai/roles/tools-by-role";
import type { UserContext } from "@/lib/ai/roles/types";

import type { RoleInfoToolResult } from "../ai-tools.types";

export function createRoleInfoTool(user: UserContext) {
  return tool({
    description:
      "Return the current user identity and which tools are available for their role.",
    inputSchema: z.object({}),
    execute: async (): Promise<RoleInfoToolResult> => {
      return {
        success: true,
        data: {
          user: {
            userId: user.userId,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
          },
          availableTools: getToolKeysForRole(user.role),
          native: getNativeToolKeysForRole(user.role),
          mcp: getMcpToolKeysForRole(user.role),
        },
      };
    },
  });
}
