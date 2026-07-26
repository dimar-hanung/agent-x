import type { UserContext } from "@/lib/ai/roles/types";
import { readOutlookMessage } from "@/lib/microsoft/outlook/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { ReadMicrosoftEmailInput } from "./schema";
import type { ReadMicrosoftEmailToolResult } from "./types";

export async function executeReadMicrosoftEmail(
  input: ReadMicrosoftEmailInput,
  ctx: { user: UserContext }
): Promise<ReadMicrosoftEmailToolResult> {
  try {
    const message = await readOutlookMessage(
      ctx.user.userId,
      input.message_id
    );

    if (!message) {
      return {
        success: false,
        message: `No message found with id ${input.message_id}.`,
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
          : "Failed to read Outlook message.",
    };
  }
}
