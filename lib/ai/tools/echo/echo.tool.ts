import { tool } from "ai";
import { z } from "zod";

import type { UserContext } from "@/lib/ai/roles/types";

import type { EchoToolResult } from "../ai-tools.types";

export function createEchoTool(user: UserContext) {
  return tool({
    description: "Echo back a message, greeting the current user by name.",
    inputSchema: z.object({
      message: z.string().min(1).describe("The message to echo back."),
    }),
    execute: async ({ message }): Promise<EchoToolResult> => {
      return {
        success: true,
        data: {
          echo: message,
          greetedAs: user.displayName,
        },
      };
    },
  });
}
