import type { McpServerKey } from "@/lib/ai/tools/tool-keys";

export interface McpHttpServerConfig {
  serverKey: McpServerKey;
  url: string;
  headers: Record<string, string>;
}

export function isMcpEnabled(): boolean {
  return process.env.MCP_ENABLED !== "false";
}

export function getMcpServerConfig(
  _serverKey: McpServerKey
): McpHttpServerConfig | null {
  if (!isMcpEnabled()) {
    return null;
  }

  return null;
}
