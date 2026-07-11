import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { authenticateApiKey } from "@/lib/api-keys/auth";
import { registerTodoMcpTools } from "@/lib/mcp/todos/tools";

const handler = createMcpHandler(
  (server) => {
    registerTodoMcpTools(server);
  },
  {
    serverInfo: {
      name: "agentx-todos",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

async function verifyToken(
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  const result = await authenticateApiKey(bearerToken);

  if (!result) {
    return undefined;
  }

  return {
    token: bearerToken!,
    clientId: result.keyId,
    scopes: ["todos:read", "todos:write"],
    extra: {
      userId: result.userId,
      keyId: result.keyId,
    },
  };
}

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
