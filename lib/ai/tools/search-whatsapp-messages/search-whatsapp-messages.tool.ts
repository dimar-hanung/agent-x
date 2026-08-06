import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSearchWhatsappMessages } from "./execute";
import { searchWhatsappMessagesInputSchema } from "./schema";

export function createSearchWhatsappMessagesTool(user: UserContext) {
  return tool({
    description:
      "Search the user's personal WhatsApp inbox by natural-language question. Internally generates 5 keywords per attempt (up to 10 attempts), returns matching messages plus AI analysis.",
    inputSchema: searchWhatsappMessagesInputSchema,
    execute: (input, options) =>
      executeSearchWhatsappMessages(input, {
        user,
        abortSignal: options.abortSignal,
      }),
  });
}
