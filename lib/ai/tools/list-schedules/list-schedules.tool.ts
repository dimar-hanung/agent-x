import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListSchedules } from "./execute";
import { listSchedulesInputSchema } from "./schema";

export function createListSchedulesTool(user: UserContext) {
  return tool({
    description: "List recurring automations for the current user.",
    inputSchema: listSchedulesInputSchema,
    execute: (input) => executeListSchedules(input, { user }),
  });
}
