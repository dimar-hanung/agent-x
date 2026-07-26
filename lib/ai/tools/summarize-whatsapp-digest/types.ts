import type { ToolResult } from "../ai-tools.types";

export interface SummarizeWhatsappDigestToolResult extends ToolResult {
  data?: {
    id: string;
    digestText: string;
    chatCount: number;
    chunkCount: number;
    coversFrom: string;
    coversTo: string;
    generatedAt: string;
  };
}
