import type { UserContext } from "@/lib/ai/roles/types";
import { listMicrosoftCalendarEvents } from "@/lib/microsoft/calendar/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { ListMicrosoftCalendarEventsInput } from "./schema";
import type { ListMicrosoftCalendarEventsToolResult } from "./types";

export async function executeListMicrosoftCalendarEvents(
  input: ListMicrosoftCalendarEventsInput,
  ctx: { user: UserContext }
): Promise<ListMicrosoftCalendarEventsToolResult> {
  try {
    const events = await listMicrosoftCalendarEvents(ctx.user.userId, {
      timeMin: input.time_min,
      timeMax: input.time_max,
      maxResults: input.max_results,
      query: input.query,
    });

    if (events === null) {
      return { success: false, message: MICROSOFT_NOT_CONNECTED_MESSAGE };
    }

    return {
      success: true,
      data: { events },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to list Microsoft Calendar events.",
    };
  }
}
