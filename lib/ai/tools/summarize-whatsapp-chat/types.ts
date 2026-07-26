import type { WhatsAppSummaryHighlights } from "@/lib/integrations/whatsapp-inbox/summary/prompt";

import type { ToolResult } from "../ai-tools.types";

export interface SummarizeWhatsappChatToolResult extends ToolResult {
  data?: {
    chatId: string;
    chatName: string;
    chatType: string;
    summaryText: string;
    highlights: WhatsAppSummaryHighlights;
    coversFrom: string;
    coversTo: string;
    messageCount: number;
    generatedAt: string;
  };
}
