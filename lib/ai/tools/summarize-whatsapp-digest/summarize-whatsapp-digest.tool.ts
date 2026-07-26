import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSummarizeWhatsappDigest } from "./execute";
import { summarizeWhatsappDigestInputSchema } from "./schema";

export function createSummarizeWhatsappDigestTool(user: UserContext) {
  return tool({
    description:
      "Generate one all-chat executive digest snapshot across active personal WhatsApp chats. Internally batches up to 100 chats per LLM request.",
    inputSchema: summarizeWhatsappDigestInputSchema,
    execute: (input) => executeSummarizeWhatsappDigest(input, { user }),
  });
}
