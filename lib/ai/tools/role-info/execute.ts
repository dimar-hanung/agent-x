import {
  getMcpToolKeysForRole,
  getNativeToolKeysForRole,
  getToolKeysForRole,
} from "@/lib/ai/roles/tools-by-role";
import type { UserContext } from "@/lib/ai/roles/types";

import type { RoleInfoInput } from "./schema";
import type { RoleInfoToolResult } from "./types";

export async function executeRoleInfo(
  _input: RoleInfoInput,
  ctx: { user: UserContext }
): Promise<RoleInfoToolResult> {
  return {
    success: true,
    data: {
      user: {
        userId: ctx.user.userId,
        email: ctx.user.email,
        role: ctx.user.role,
        displayName: ctx.user.displayName,
      },
      availableTools: getToolKeysForRole(ctx.user.role),
      native: getNativeToolKeysForRole(ctx.user.role),
      mcp: getMcpToolKeysForRole(ctx.user.role),
    },
  };
}
