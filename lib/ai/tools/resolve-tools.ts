import type { Tool } from "ai";

import { createMcpToolsForUser } from "@/lib/ai/mcp";
import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import {
  getMcpToolKeysForRole,
  getNativeToolKeysForRole,
} from "@/lib/ai/roles/tools-by-role";
import type { UserContext } from "@/lib/ai/roles/types";
import type { NativeToolKey, ToolKey } from "@/lib/ai/tools/tool-keys";

import { createToolsForUser } from "./index";

export interface CreateAllToolsOptions {
  runtimeContext?: ChatAgentRuntimeContext;
  excludeNativeKeys?: NativeToolKey[];
}

export async function createAllToolsForUser(
  user: UserContext,
  options?: CreateAllToolsOptions
): Promise<Partial<Record<ToolKey, Tool>>> {
  const nativeKeys = getNativeToolKeysForRole(user.role).filter(
    (key) => !options?.excludeNativeKeys?.includes(key)
  );
  const mcpKeys = getMcpToolKeysForRole(user.role);

  const nativeTools = createToolsForUser(
    user,
    nativeKeys,
    options?.runtimeContext
  );
  const mcpTools = await createMcpToolsForUser(user, mcpKeys);

  return { ...nativeTools, ...mcpTools };
}
