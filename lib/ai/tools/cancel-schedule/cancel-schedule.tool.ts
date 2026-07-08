import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeCancelSchedule } from "./execute";
import { cancelScheduleInputSchema } from "./schema";

export function createCancelScheduleTool(user: UserContext) {
  return tool({
    description: "Cancel an active scheduled job for the current user.",
    inputSchema: cancelScheduleInputSchema,
    execute: (input) => executeCancelSchedule(input, { user }),
  });
}
