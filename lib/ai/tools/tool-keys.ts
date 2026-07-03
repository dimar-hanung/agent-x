export type NativeToolKey =
  | "get_time"
  | "echo"
  | "role_info"
  | "exa_web_search"
  | "exa_web_fetch"
  | "create_schedule"
  | "list_schedules"
  | "cancel_schedule"
  | "send_email"
  | "search_inbox"
  | "read_email";

const MCP_TOOL_KEYS = [] as const satisfies readonly string[];

export type McpToolKey = (typeof MCP_TOOL_KEYS)[number];

export type ToolKey = NativeToolKey | McpToolKey;

const MCP_SERVER_KEYS = [] as const satisfies readonly string[];

export type McpServerKey = (typeof MCP_SERVER_KEYS)[number];

export interface McpToolDefinition {
  serverKey: McpServerKey;
  mcpToolName: string;
  toolKey: McpToolKey;
  description?: string;
}

export function isMcpToolKey(key: ToolKey): key is McpToolKey {
  return (MCP_TOOL_KEYS as readonly ToolKey[]).includes(key);
}

export function isNativeToolKey(key: ToolKey): key is NativeToolKey {
  return !isMcpToolKey(key);
}

const EXA_TOOL_KEYS = ["exa_web_search", "exa_web_fetch"] as const satisfies readonly NativeToolKey[];

export function isExaToolKey(key: ToolKey): key is (typeof EXA_TOOL_KEYS)[number] {
  return (EXA_TOOL_KEYS as readonly ToolKey[]).includes(key);
}
