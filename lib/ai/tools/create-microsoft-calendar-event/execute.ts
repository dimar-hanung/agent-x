import type { UserContext } from "@/lib/ai/roles/types";
import { createMicrosoftCalendarEvent } from "@/lib/microsoft/calendar/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { CreateMicrosoftCalendarEventInput } from "./schema";
import type { CreateMicrosoftCalendarEventToolResult } from "./types";

export async function executeCreateMicrosoftCalendarEvent(
  input: CreateMicrosoftCalendarEventInput,
  ctx: { user: UserContext }
): Promise<CreateMicrosoftCalendarEventToolResult> {
  try {
    const event = await createMicrosoftCalendarEvent(ctx.user.userId, {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: input.start,
      end: input.end,
      timeZone: input.time_zone,
      attendees: input.attendees,
    });

    if (event === null) {
      return { success: false, message: MICROSOFT_NOT_CONNECTED_MESSAGE };
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
          : "Failed to create Microsoft Calendar event.",
    };
  }
}
