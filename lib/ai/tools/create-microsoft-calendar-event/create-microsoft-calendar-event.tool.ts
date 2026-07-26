import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeCreateMicrosoftCalendarEvent } from "./execute";
import { createMicrosoftCalendarEventInputSchema } from "./schema";

export function createCreateMicrosoftCalendarEventTool(user: UserContext) {
  return tool({
    description:
      "Create an event on the user's connected Microsoft Calendar. Confirm title, start, and end when ambiguous. Default timezone Asia/Jakarta.",
    inputSchema: createMicrosoftCalendarEventInputSchema,
    execute: (input) => executeCreateMicrosoftCalendarEvent(input, { user }),
  });
}
