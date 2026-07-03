import { tool } from "ai";
import { z } from "zod";

import type { UserContext } from "@/lib/ai/roles/types";
import { sendGmailMessage } from "@/lib/gmail/smtp";
import { getGmailCredentials } from "@/lib/integrations/gmail-repository";

import type { SendEmailToolResult } from "../ai-tools.types";

const NOT_CONNECTED_MESSAGE =
  "Gmail is not connected. Go to Settings > Integrations to connect your account.";

export function createSendEmailTool(user: UserContext) {
  return tool({
    description:
      "Send an email from the user's connected Gmail account. Confirm recipient and subject when the request is ambiguous.",
    inputSchema: z.object({
      to: z.string().email().describe("Recipient email address."),
      subject: z.string().min(1).describe("Email subject line."),
      body: z.string().min(1).describe("Email body content."),
      cc: z.string().email().optional().describe("Optional CC recipient."),
      bcc: z.string().email().optional().describe("Optional BCC recipient."),
      isHtml: z
        .boolean()
        .optional()
        .describe("Whether the body is HTML. Defaults to plain text."),
    }),
    execute: async ({
      to,
      subject,
      body,
      cc,
      bcc,
      isHtml,
    }): Promise<SendEmailToolResult> => {
      const credentials = await getGmailCredentials(user.userId);

      if (!credentials) {
        return { success: false, message: NOT_CONNECTED_MESSAGE };
      }

      try {
        const result = await sendGmailMessage(credentials, {
          to,
          subject,
          body,
          cc,
          bcc,
          isHtml,
        });

        return {
          success: true,
          data: {
            messageId: result.messageId,
            to,
            sentBy: user.displayName,
          },
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to send email via Gmail.",
        };
      }
    },
  });
}
