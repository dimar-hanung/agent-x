import type { ToolResult } from "../ai-tools.types";

export interface ListWhatsappContactsToolResult extends ToolResult {
  data?: {
    connected: boolean;
    directorySyncedAt: string | null;
    totalCount: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    contacts: Array<{
      id: string;
      contactJid: string;
      displayName: string;
      phoneE164: string | null;
    }>;
  };
}
