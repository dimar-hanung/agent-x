import type { UserContext } from "@/lib/ai/roles/types";
import { listCalendarEvents } from "@/lib/google/calendar/client";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { ListCalendarEventsInput } from "./schema";
import type { ListCalendarEventsToolResult } from "./types";

export async function executeListCalendarEvents(
  input: ListCalendarEventsInput,
  ctx: { user: UserContext }
): Promise<ListCalendarEventsToolResult> {
  try {
    const events = await listCalendarEvents(ctx.user.userId, {
      timeMin: input.time_min,
      timeMax: input.time_max,
      maxResults: input.max_results,
      query: input.query,
    });

    if (events === null) {
      return { success: false, message: GOOGLE_NOT_CONNECTED_MESSAGE };
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
          : "Failed to list Google Calendar events.",
    };
  }
}
