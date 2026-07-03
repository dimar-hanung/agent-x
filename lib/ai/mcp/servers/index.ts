import type { McpServerKey, McpToolDefinition } from "@/lib/ai/tools/tool-keys";

export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [];

export const MCP_SERVERS = {} as Record<
  McpServerKey,
  { definitions: McpToolDefinition[] }
>;
