import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListCalendarEvents } from "./execute";
import { listCalendarEventsInputSchema } from "./schema";

export function createListCalendarEventsTool(user: UserContext) {
  return tool({
    description:
      "List events from the user's primary Google Calendar. For 'today' or 'this week', set time_min/time_max in Asia/Jakarta. If both are omitted, defaults to today through the next 7 days (not unbounded future).",
    inputSchema: listCalendarEventsInputSchema,
    execute: (input) => executeListCalendarEvents(input, { user }),
  });
}
