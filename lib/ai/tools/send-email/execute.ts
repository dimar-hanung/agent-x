import type { UserContext } from "@/lib/ai/roles/types";
import { sendGmailApiMessage } from "@/lib/google/gmail/client";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { SendEmailInput } from "./schema";
import type { SendEmailToolResult } from "./types";

export async function executeSendEmail(
  input: SendEmailInput,
  ctx: { user: UserContext }
): Promise<SendEmailToolResult> {
  try {
    const result = await sendGmailApiMessage(ctx.user.userId, {
      to: input.to,
      subject: input.subject,
      body: input.body,
      cc: input.cc,
      bcc: input.bcc,
      isHtml: input.isHtml,
    });

    if (result === null) {
      return { success: false, message: GOOGLE_NOT_CONNECTED_MESSAGE };
    }

    return {
      success: true,
      data: {
        messageId: result.id,
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
