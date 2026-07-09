import type { UserContext } from "@/lib/ai/roles/types";
import { readInboxMessage } from "@/lib/gmail/imap";
import { getGmailCredentials } from "@/lib/integrations/gmail-repository";

import { GMAIL_NOT_CONNECTED_MESSAGE } from "../gmail/constants";
import type { ReadEmailInput } from "./schema";
import type { ReadEmailToolResult } from "./types";

export async function executeReadEmail(
  input: ReadEmailInput,
  ctx: { user: UserContext }
): Promise<ReadEmailToolResult> {
  const credentials = await getGmailCredentials(ctx.user.userId);

  if (!credentials) {
    return { success: false, message: GMAIL_NOT_CONNECTED_MESSAGE };
  }

  try {
    const message = await readInboxMessage(credentials, { uid: input.uid });

    if (!message) {
      return {
        success: false,
        message: `No message found with UID ${input.uid}.`,
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
