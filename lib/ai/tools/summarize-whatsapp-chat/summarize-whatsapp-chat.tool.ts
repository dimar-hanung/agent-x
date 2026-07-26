import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSummarizeWhatsappChat } from "./execute";
import { summarizeWhatsappChatInputSchema } from "./schema";

export function createSummarizeWhatsappChatTool(user: UserContext) {
  return tool({
    description:
      "Generate an executive summary for a specific personal WhatsApp chat (DM or group) by name or JID.",
    inputSchema: summarizeWhatsappChatInputSchema,
    execute: (input) => executeSummarizeWhatsappChat(input, { user }),
  });
}
