import { tool } from "ai";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";

import { executeCreateSchedule } from "./execute";
import { createScheduleInputSchema } from "./schema";

export function createCreateScheduleTool(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext
) {
  return tool({
    description:
      "Create a recurring automation (cron only) that runs an AI prompt on a schedule. Delivered via WhatsApp — use WhatsApp formatting, not Markdown. For one-time reminders use create_todo with starts_at.",
    inputSchema: createScheduleInputSchema,
    execute: (input) =>
      executeCreateSchedule(input, { user, runtimeContext }),
  });
}
