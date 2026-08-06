import type { ToolResult } from "../ai-tools.types";

export interface ListWhatsappGroupsToolResult extends ToolResult {
  data?: {
    connected: boolean;
    directorySyncedAt: string | null;
    totalCount: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    groups: Array<{
      id: string;
      groupJid: string;
      displayName: string;
      participantCount: number | null;
    }>;
  };
}
