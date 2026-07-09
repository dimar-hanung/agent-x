import type { UserContext } from "@/lib/ai/roles/types";
import { sendGmailMessage } from "@/lib/gmail/smtp";
import { getGmailCredentials } from "@/lib/integrations/gmail-repository";

import { GMAIL_NOT_CONNECTED_MESSAGE } from "../gmail/constants";
import type { SendEmailInput } from "./schema";
import type { SendEmailToolResult } from "./types";

export async function executeSendEmail(
  input: SendEmailInput,
  ctx: { user: UserContext }
): Promise<SendEmailToolResult> {
  const credentials = await getGmailCredentials(ctx.user.userId);

  if (!credentials) {
    return { success: false, message: GMAIL_NOT_CONNECTED_MESSAGE };
  }

  try {
    const result = await sendGmailMessage(credentials, {
      to: input.to,
      subject: input.subject,
      body: input.body,
      cc: input.cc,
      bcc: input.bcc,
      isHtml: input.isHtml,
    });

    return {
      success: true,
      data: {
        messageId: result.messageId,
        to: input.to,
        sentBy: ctx.user.displayName,
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
}
