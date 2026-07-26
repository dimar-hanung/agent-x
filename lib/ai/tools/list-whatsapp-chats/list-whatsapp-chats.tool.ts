import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListWhatsappChats } from "./execute";
import { listWhatsappChatsInputSchema } from "./schema";

export function createListWhatsappChatsTool(user: UserContext) {
  return tool({
    description:
      "List the user's connected personal WhatsApp chats (DMs and groups) with last activity and whether a summary exists.",
    inputSchema: listWhatsappChatsInputSchema,
    execute: (input) => executeListWhatsappChats(input, { user }),
  });
}
