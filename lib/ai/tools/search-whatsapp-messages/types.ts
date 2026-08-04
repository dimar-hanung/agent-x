import type { WhatsAppMessageSearchHit } from "@/lib/integrations/whatsapp-inbox/search/service";

import type { ToolResult } from "../ai-tools.types";

export interface SearchWhatsappMessagesToolResult extends ToolResult {
  data?: {
    query: string;
    analysisText: string;
    results: WhatsAppMessageSearchHit[];
    attemptedKeywords: string[];
    successfulKeywords: string[];
    chatCount: number;
    chunkCount: number;
    messageCount: number;
    chatFilter: string | null;
  };
}
