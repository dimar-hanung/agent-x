import type { UserContext } from "@/lib/ai/roles/types";
import { searchInboxMessages } from "@/lib/gmail/imap";
import { getGmailCredentials } from "@/lib/integrations/gmail-repository";

import { GMAIL_NOT_CONNECTED_MESSAGE } from "../gmail/constants";
import type { SearchInboxInput } from "./schema";
import type { SearchInboxToolResult } from "./types";

export async function executeSearchInbox(
  input: SearchInboxInput,
  ctx: { user: UserContext }
): Promise<SearchInboxToolResult> {
  const credentials = await getGmailCredentials(ctx.user.userId);

  if (!credentials) {
    return { success: false, message: GMAIL_NOT_CONNECTED_MESSAGE };
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
}
