import type { UserContext } from "@/lib/ai/roles/types";
import { searchGmailMessages } from "@/lib/google/gmail/client";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { SearchInboxInput } from "./schema";
import type { SearchInboxToolResult } from "./types";

export async function executeSearchInbox(
  input: SearchInboxInput,
  ctx: { user: UserContext }
): Promise<SearchInboxToolResult> {
  try {
    const messages = await searchGmailMessages(ctx.user.userId, {
      from: input.from,
      subject: input.subject,
      unread: input.unread,
      since: input.since,
      limit: input.limit,
    });

    if (messages === null) {
      return { success: false, message: GOOGLE_NOT_CONNECTED_MESSAGE };
    }

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
