import { tool } from "ai";
import { z } from "zod";

import type { UserContext } from "@/lib/ai/roles/types";
import { searchInboxMessages } from "@/lib/gmail/imap";
import { getGmailCredentials } from "@/lib/integrations/gmail-repository";

import type { SearchInboxToolResult } from "../ai-tools.types";

const NOT_CONNECTED_MESSAGE =
  "Gmail is not connected. Go to Settings > Integrations to connect your account.";

export function createSearchInboxTool(user: UserContext) {
  return tool({
    description:
      "Search the user's Gmail inbox. Returns message summaries with UIDs for use with read_email.",
    inputSchema: z.object({
      from: z.string().optional().describe("Filter by sender email or name."),
      subject: z
        .string()
        .optional()
        .describe("Filter by subject containing this text."),
      unread: z.boolean().optional().describe("Only return unread messages."),
      since: z
        .string()
        .optional()
        .describe("Only messages since this ISO date string."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe("Max messages to return (default 10, max 25)."),
    }),
    execute: async (input): Promise<SearchInboxToolResult> => {
      const credentials = await getGmailCredentials(user.userId);

      if (!credentials) {
        return { success: false, message: NOT_CONNECTED_MESSAGE };
      }

      try {
        const messages = await searchInboxMessages(credentials, input);

        return {
          success: true,
          data: { messages },
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to search Gmail inbox.",
        };
      }
    },
  });
}
