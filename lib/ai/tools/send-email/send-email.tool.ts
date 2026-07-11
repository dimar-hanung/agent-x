import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSendEmail } from "./execute";
import { sendEmailInputSchema } from "./schema";

export function createSendEmailTool(user: UserContext) {
  return tool({
    description:
      "Send an email from the user's connected Google account (Gmail). Confirm recipient and subject when the request is ambiguous.",
    inputSchema: sendEmailInputSchema,
    execute: (input) => executeSendEmail(input, { user }),
  });
}
