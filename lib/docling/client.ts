import {
  getDoclingApiKey,
  getDoclingServeUrl,
  isDoclingConfigured,
} from "./env";
import type {
  ChunkDocumentResponse,
  ConvertDocumentResponse,
  TaskStatusResponse,
} from "./types";

export class DoclingNotConfiguredError extends Error {
  constructor() {
    super("DOCLING_SERVE_URL is not configured.");
    this.name = "DoclingNotConfiguredError";
  }
}

export class DoclingApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DoclingApiError";
    this.status = status;
  }
}

const ASYNC_BYTE_THRESHOLD = 8 * 1024 * 1024;
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 300;

function doclingHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(extra as Record<string, string>),
  };
  const apiKey = getDoclingApiKey();
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }
  return headers;
}

async function parseDoclingError(response: Response): Promise<string> {
  let message = `Docling API error (${response.status})`;
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      message = String(body.detail[0].msg);
    }
  } catch {
    // keep default
  }
  return message;
}

function bufferToBlob(buffer: Buffer, filename: string): Blob {
  const copy = Uint8Array.from(buffer);
  return new Blob([copy], { type: "application/octet-stream" });
}

function buildChunkFormData(
  buffer: Buffer,
  filename: string,
  options?: { maxTokens?: number }
): FormData {
  const form = new FormData();
  form.append("files", bufferToBlob(buffer, filename), filename);
  form.append("chunking_use_markdown_tables", "true");
  form.append("chunking_include_raw_text", "true");
  form.append("chunking_merge_peers", "true");
  form.append("chunking_max_tokens", String(options?.maxTokens ?? 512));
  form.append("convert_do_ocr", "true");
  form.append("convert_table_mode", "accurate");
  return form;
}

function buildConvertFormData(buffer: Buffer, filename: string): FormData {
  const form = new FormData();
  form.append("files", bufferToBlob(buffer, filename), filename);
  form.append("to_formats", "md");
  form.append("convert_do_ocr", "true");
  form.append("convert_table_mode", "accurate");
  return form;
}

async function pollTaskResult(taskId: string): Promise<ChunkDocumentResponse> {
  const base = getDoclingServeUrl().replace(/\/$/, "");

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    const statusRes = await fetch(
      `${base}/v1/status/poll/${encodeURIComponent(taskId)}`,
      { headers: doclingHeaders() }
    );

    if (!statusRes.ok) {
      throw new DoclingApiError(
        statusRes.status,
        await parseDoclingError(statusRes)
      );
    }

    const status = (await statusRes.json()) as TaskStatusResponse;
    const state = status.task_status?.toLowerCase() ?? "";

    if (state === "success" || state === "completed") {
      const resultRes = await fetch(
        `${base}/v1/result/${encodeURIComponent(taskId)}`,
        { headers: doclingHeaders() }
      );
      if (!resultRes.ok) {
        throw new DoclingApiError(
          resultRes.status,
          await parseDoclingError(resultRes)
        );
      }
      return (await resultRes.json()) as ChunkDocumentResponse;
    }

    if (state === "failure" || state === "failed") {
      throw new DoclingApiError(500, "Gagal memproses dokumen di Docling.");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new DoclingApiError(504, "Waktu tunggu Docling habis.");
}

export async function chunkHybridFile({
  buffer,
  filename,
  maxTokens,
}: {
  buffer: Buffer;
  filename: string;
  maxTokens?: number;
}): Promise<ChunkDocumentResponse> {
  if (!isDoclingConfigured()) {
    throw new DoclingNotConfiguredError();
  }

  const base = getDoclingServeUrl().replace(/\/$/, "");
  const form = buildChunkFormData(buffer, filename, { maxTokens });
  const useAsync = buffer.byteLength >= ASYNC_BYTE_THRESHOLD;
  const path = useAsync
    ? "/v1/chunk/hybrid/file/async"
    : "/v1/chunk/hybrid/file";

  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: doclingHeaders(),
    body: form,
  });

  if (!response.ok) {
    throw new DoclingApiError(
      response.status,
      await parseDoclingError(response)
    );
  }

  if (useAsync) {
    const task = (await response.json()) as TaskStatusResponse;
    if (!task.task_id) {
      throw new DoclingApiError(500, "Docling tidak mengembalikan task_id.");
    }
    return pollTaskResult(task.task_id);
  }

  return (await response.json()) as ChunkDocumentResponse;
}

export async function convertFileToMarkdown({
  buffer,
  filename,
}: {
  buffer: Buffer;
  filename: string;
}): Promise<string> {
  if (!isDoclingConfigured()) {
    throw new DoclingNotConfiguredError();
  }

  const base = getDoclingServeUrl().replace(/\/$/, "");
  const form = buildConvertFormData(buffer, filename);

  const response = await fetch(`${base}/v1/convert/file`, {
    method: "POST",
    headers: doclingHeaders(),
    body: form,
  });

  if (!response.ok) {
    throw new DoclingApiError(
      response.status,
      await parseDoclingError(response)
    );
  }

  const data = (await response.json()) as ConvertDocumentResponse;
  // Docling Serve returns singular `document`, not `documents[]`.
  const doc = data.document ?? data.documents?.[0];
  const md = doc?.md_content?.trim();
  if (md) {
    return md;
  }
  const text = doc?.text_content?.trim();
  return text ?? "";
}
