export interface ChunkedDocumentResultItem {
  filename: string;
  chunk_index: number;
  text: string;
  raw_text?: string | null;
  num_tokens?: number | null;
  headings?: string[] | null;
  captions?: string[] | null;
  doc_items: string[];
  page_numbers?: number[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface ChunkDocumentResponse {
  chunks: ChunkedDocumentResultItem[];
  documents: unknown[];
  processing_time: number;
}

export interface TaskStatusResponse {
  task_id: string;
  task_status: string;
  task_position?: number | null;
  task_meta?: Record<string, unknown> | null;
}

export interface ConvertDocumentResponse {
  document?: {
    filename?: string;
    md_content?: string | null;
    text_content?: string | null;
  };
  documents?: Array<{
    filename?: string;
    md_content?: string | null;
    text_content?: string | null;
  }>;
  status?: string;
  processing_time?: number;
}
