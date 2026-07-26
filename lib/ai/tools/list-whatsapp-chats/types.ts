import type { ToolResult } from "../ai-tools.types";

export interface ListWhatsappChatsToolResult extends ToolResult {
  data?: {
    connected: boolean;
    chats: Array<{
      id: string;
      displayName: string;
      chatType: string;
      lastMessageAt: string | null;
      hasSummary: boolean;
    }>;
  };
}
