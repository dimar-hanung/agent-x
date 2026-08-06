import type { UserFileIndexStatus } from "@/lib/db/schema";

import type { ToolResult } from "../ai-tools.types";

export interface AskFileChunk {
  chunkIndex: number;
  chunkText: string;
  headings: string[] | null;
  pageNumbers: number[] | null;
}

export interface AskFileToolResult extends ToolResult {
  data?: {
    fileId: string;
    fileName: string;
    indexStatus: UserFileIndexStatus | "none";
    chunks?: AskFileChunk[];
  };
}
