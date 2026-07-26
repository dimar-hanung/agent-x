import type { UserContext } from "@/lib/ai/roles/types";
import { sendOutlookMessage } from "@/lib/microsoft/outlook/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { SendMicrosoftEmailInput } from "./schema";
import type { SendMicrosoftEmailToolResult } from "./types";

export async function executeSendMicrosoftEmail(
  input: SendMicrosoftEmailInput,
  ctx: { user: UserContext }
): Promise<SendMicrosoftEmailToolResult> {
  try {
    const result = await sendOutlookMessage(ctx.user.userId, {
      to: input.to,
      subject: input.subject,
      body: input.body,
      cc: input.cc,
      bcc: input.bcc,
      isHtml: input.isHtml,
    });

    if (result === null) {
      return { success: false, message: MICROSOFT_NOT_CONNECTED_MESSAGE };
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
          : "Failed to send email via Outlook.",
    };
  }
}
