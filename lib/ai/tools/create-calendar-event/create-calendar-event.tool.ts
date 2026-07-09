import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeCreateCalendarEvent } from "./execute";
import { createCalendarEventInputSchema } from "./schema";

export function createCreateCalendarEventTool(user: UserContext) {
  return tool({
    description:
      "Create an event on the user's connected Google Calendar. Confirm title, start, and end when ambiguous. Default timezone Asia/Jakarta.",
    inputSchema: createCalendarEventInputSchema,
    execute: (input) => executeCreateCalendarEvent(input, { user }),
  });
}
