import type { UserContext } from "@/lib/ai/roles/types";
import { searchOutlookMessages } from "@/lib/microsoft/outlook/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { SearchMicrosoftInboxInput } from "./schema";
import type { SearchMicrosoftInboxToolResult } from "./types";

export async function executeSearchMicrosoftInbox(
  input: SearchMicrosoftInboxInput,
  ctx: { user: UserContext }
): Promise<SearchMicrosoftInboxToolResult> {
  try {
    const messages = await searchOutlookMessages(ctx.user.userId, {
      from: input.from,
      subject: input.subject,
      unread: input.unread,
      since: input.since,
      limit: input.limit,
    });

    if (messages === null) {
      return { success: false, message: MICROSOFT_NOT_CONNECTED_MESSAGE };
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
          : "Failed to search Outlook inbox.",
    };
  }
}
