import type { UserContext } from "@/lib/ai/roles/types";
import { readGmailMessage } from "@/lib/google/gmail/client";
import { getGoogleCredentials } from "@/lib/integrations/google-repository";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { ReadEmailInput } from "./schema";
import type { ReadEmailToolResult } from "./types";

export async function executeReadEmail(
  input: ReadEmailInput,
  ctx: { user: UserContext }
): Promise<ReadEmailToolResult> {
  const credentials = await getGoogleCredentials(ctx.user.userId);

  if (!credentials) {
    return { success: false, message: GOOGLE_NOT_CONNECTED_MESSAGE };
  }

  try {
    const message = await readGmailMessage(ctx.user.userId, input.message_id);

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
          : "Failed to read Gmail message.",
    };
  }
}
