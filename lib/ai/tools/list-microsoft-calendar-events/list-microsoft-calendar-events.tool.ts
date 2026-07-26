import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListMicrosoftCalendarEvents } from "./execute";
import { listMicrosoftCalendarEventsInputSchema } from "./schema";

export function createListMicrosoftCalendarEventsTool(user: UserContext) {
  return tool({
    description:
      "List events from the user's connected Microsoft Calendar. For 'today' or 'this week', set time_min/time_max in Asia/Jakarta. If both are omitted, defaults to today through the next 7 days.",
    inputSchema: listMicrosoftCalendarEventsInputSchema,
    execute: (input) => executeListMicrosoftCalendarEvents(input, { user }),
  });
}
