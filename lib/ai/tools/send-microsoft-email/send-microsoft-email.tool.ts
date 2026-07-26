import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSendMicrosoftEmail } from "./execute";
import { sendMicrosoftEmailInputSchema } from "./schema";

export function createSendMicrosoftEmailTool(user: UserContext) {
  return tool({
    description:
      "Send an email from the user's connected Microsoft account (Outlook). Confirm recipient and subject when the request is ambiguous.",
    inputSchema: sendMicrosoftEmailInputSchema,
    execute: (input) => executeSendMicrosoftEmail(input, { user }),
  });
}
