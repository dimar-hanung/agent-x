import { tool } from "ai";
import { z } from "zod";

import type { UserContext } from "@/lib/ai/roles/types";
import { readInboxMessage } from "@/lib/gmail/imap";
import { getGmailCredentials } from "@/lib/integrations/gmail-repository";

import type { ReadEmailToolResult } from "../ai-tools.types";

const NOT_CONNECTED_MESSAGE =
  "Gmail is not connected. Go to Settings > Integrations to connect your account.";

export function createReadEmailTool(user: UserContext) {
  return tool({
    description:
      "Read the full content of a Gmail message by UID. Use search_inbox first when the user references an email without a UID.",
    inputSchema: z.object({
      uid: z.number().int().positive().describe("Message UID from search_inbox."),
    }),
    execute: async ({ uid }): Promise<ReadEmailToolResult> => {
      const credentials = await getGmailCredentials(user.userId);

      if (!credentials) {
        return { success: false, message: NOT_CONNECTED_MESSAGE };
      }

      try {
        const message = await readInboxMessage(credentials, { uid });

        if (!message) {
          return {
            success: false,
            message: `No message found with UID ${uid}.`,
          };
        }

        return {
          success: true,
          data: message,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to read Gmail message.",
        };
      }
    },
  });
}
