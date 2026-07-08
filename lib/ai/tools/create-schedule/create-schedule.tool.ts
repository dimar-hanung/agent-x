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
      "Create a scheduled job that runs an AI prompt at a specific time or on a cron schedule. Stored prompts run on Kanal and are delivered via WhatsApp — use WhatsApp formatting syntax, not Markdown.",
    inputSchema: createScheduleInputSchema,
    execute: (input) =>
      executeCreateSchedule(input, { user, runtimeContext }),
  });
}
