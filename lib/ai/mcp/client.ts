import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";

import type { McpServerKey } from "@/lib/ai/tools/tool-keys";

import { getMcpServerConfig } from "./mcp-env";

export async function withMcpClient<T>(
  serverKey: McpServerKey,
  fn: (client: MCPClient) => Promise<T>
): Promise<T | null> {
  const config = getMcpServerConfig(serverKey);

  if (!config) {
    console.warn(`[mcp] Skipping server "${serverKey}": not configured or disabled.`);
    return null;
  }

  let client: MCPClient | undefined;

  try {
    client = await createMCPClient({
      transport: {
        type: "http",
        url: config.url,
        headers: config.headers,
      },
    });

    return await fn(client);
  } catch (error) {
    console.error(`[mcp] Failed to connect to server "${serverKey}":`, error);
    return null;
  } finally {
    await client?.close();
  }
}
