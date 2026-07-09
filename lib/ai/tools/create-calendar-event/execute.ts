import type { UserContext } from "@/lib/ai/roles/types";
import { createCalendarEvent } from "@/lib/google/calendar/client";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { CreateCalendarEventInput } from "./schema";
import type { CreateCalendarEventToolResult } from "./types";

export async function executeCreateCalendarEvent(
  input: CreateCalendarEventInput,
  ctx: { user: UserContext }
): Promise<CreateCalendarEventToolResult> {
  try {
    const event = await createCalendarEvent(ctx.user.userId, {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: input.start,
      end: input.end,
      timeZone: input.time_zone,
      attendees: input.attendees,
    });

    if (event === null) {
      return { success: false, message: GOOGLE_NOT_CONNECTED_MESSAGE };
    }

    return {
      success: true,
      data: event,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create Google Calendar event.",
    };
  }
}
