import type { Tool } from "ai";
import type { z } from "zod";

import type { UserContext } from "@/lib/ai/roles/types";
import type { McpServerKey, McpToolKey } from "@/lib/ai/tools/tool-keys";

import { withMcpClient } from "./client";
import { isMcpEnabled } from "./mcp-env";
import { MCP_TOOL_DEFINITIONS } from "./servers";

function groupKeysByServer(
  keys: McpToolKey[]
): Map<McpServerKey, McpToolKey[]> {
  const grouped = new Map<McpServerKey, McpToolKey[]>();

  for (const key of keys) {
    const definition = MCP_TOOL_DEFINITIONS.find((item) => item.toolKey === key);

    if (!definition) {
      continue;
    }

    const existing = grouped.get(definition.serverKey) ?? [];
    existing.push(key);
    grouped.set(definition.serverKey, existing);
  }

  return grouped;
}

function buildSchemasForServer(
  _serverKey: McpServerKey,
  _keys: McpToolKey[]
): Record<string, { inputSchema: z.ZodType }> {
  return {};
}

function renameServerTools(
  serverTools: Record<string, Tool>,
  serverKey: McpServerKey,
  keys: McpToolKey[]
): Partial<Record<McpToolKey, Tool>> {
  const renamed: Partial<Record<string, Tool>> = {};

  for (const definition of MCP_TOOL_DEFINITIONS) {
    if (
      definition.serverKey !== serverKey ||
      !keys.includes(definition.toolKey) ||
      !(definition.mcpToolName in serverTools)
    ) {
      continue;
    }

    renamed[definition.toolKey] = serverTools[definition.mcpToolName];
  }

  return renamed as Partial<Record<McpToolKey, Tool>>;
}

export async function createMcpToolsForUser(
  _user: UserContext,
  keys: McpToolKey[]
): Promise<Partial<Record<McpToolKey, Tool>>> {
  if (
    !isMcpEnabled() ||
    keys.length === 0 ||
    MCP_TOOL_DEFINITIONS.length === 0
  ) {
    return {} as Partial<Record<McpToolKey, Tool>>;
  }

  const grouped = groupKeysByServer(keys);
  const merged: Partial<Record<McpToolKey, Tool>> = {};

  for (const [serverKey, serverKeys] of grouped) {
    const schemas = buildSchemasForServer(serverKey, serverKeys);

    if (Object.keys(schemas).length === 0) {
      continue;
    }

    const serverTools = await withMcpClient(serverKey, async (client) => {
      return client.tools({ schemas });
    });

    if (!serverTools) {
      continue;
    }

    Object.assign(
      merged,
      renameServerTools(serverTools as Record<string, Tool>, serverKey, serverKeys)
    );
  }

  return merged;
}
