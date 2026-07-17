"use client";

import * as React from "react";

import { MessageMarkdown } from "@/components/chat/message-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PreviewChunk {
  chunkIndex: number;
  text: string;
  rawText?: string | null;
  headings: string[] | null;
  pageNumbers: number[] | null;
}

interface FilePreviewPanelProps {
  fileId: string;
  fileName: string;
  /** When index becomes ready, remount/reload preview. */
  indexStatus?: string;
}

type PreviewState =
  | { status: "loading" }
  | {
      status: "ready";
      kind: "pdf";
      url: string;
      indexStatus: string;
      message?: string;
    }
  | {
      status: "ready";
      kind: "chunks";
      chunks: PreviewChunk[];
      fileType: string;
      pdfUrl: string | null;
      indexStatus: string;
      message?: string;
    }
  | { status: "error"; message: string };

function formatChunkMeta(chunk: PreviewChunk): string {
  const parts: string[] = [`Chunk ${chunk.chunkIndex + 1}`];
  if (chunk.pageNumbers && chunk.pageNumbers.length > 0) {
    parts.push(`hal. ${chunk.pageNumbers.join(", ")}`);
  }
  return parts.join(" · ");
}

function normalizeForCompare(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildContextPath(headings: string[] | null | undefined): string | null {
  if (!headings || headings.length === 0) {
    return null;
  }
  const cleaned = headings.map((h) => h.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" › ") : null;
}

/** Prefer raw body + explicit context strip; fall back to contextualized text. */
function resolveChunkDisplay(chunk: PreviewChunk): {
  contextPath: string | null;
  body: string;
  hasEmbeddedContext: boolean;
} {
  const contextPath = buildContextPath(chunk.headings);
  const raw = chunk.rawText?.trim() || null;
  const contextualized = chunk.text.trim();

  if (raw && normalizeForCompare(raw) !== normalizeForCompare(contextualized)) {
    return {
      contextPath,
      body: raw,
      hasEmbeddedContext: true,
    };
  }

  return {
    contextPath,
    body: contextualized,
    hasEmbeddedContext: Boolean(contextPath),
  };
}

function ChunkCard({ chunk }: { chunk: PreviewChunk }) {
  const { contextPath, body, hasEmbeddedContext } = resolveChunkDisplay(chunk);
  const [showEmbedded, setShowEmbedded] = React.useState(false);
  const embeddedText = chunk.text.trim();
  const canToggleEmbedded =
    Boolean(chunk.rawText?.trim()) &&
    normalizeForCompare(chunk.rawText ?? "") !==
      normalizeForCompare(embeddedText);

  return (
    <article
      className="bg-muted/20 rounded-md border px-3 py-3"
      aria-label={formatChunkMeta(chunk)}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-[0.7rem]">
          {formatChunkMeta(chunk)}
        </Badge>
        {hasEmbeddedContext ? (
          <Badge variant="outline" className="text-[0.7rem]">
            Contextualized
          </Badge>
        ) : null}
      </div>

      {contextPath ? (
        <div className="border-primary/20 bg-primary/5 mb-3 rounded-md border px-2.5 py-2">
          <p className="text-muted-foreground mb-0.5 text-[0.65rem] font-medium tracking-wide uppercase">
            Konteks
          </p>
          <p className="text-foreground text-xs leading-snug font-medium">
            {contextPath}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground mb-3 text-xs italic">
          Tidak ada heading konteks untuk chunk ini.
        </p>
      )}

      <MessageMarkdown content={body} className="text-[0.8125rem]" />

      {canToggleEmbedded ? (
        <div className="mt-3 border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowEmbedded((v) => !v)}
          >
            {showEmbedded
              ? "Sembunyikan teks embed"
              : "Tampilkan teks embed (dengan konteks)"}
          </Button>
          {showEmbedded ? (
            <div className="bg-background/60 mt-2 rounded-md border px-2.5 py-2">
              <p className="text-muted-foreground mb-1 text-[0.65rem] font-medium tracking-wide uppercase">
                Teks yang di-embed
              </p>
              <MessageMarkdown
                content={embeddedText}
                className="text-[0.8125rem]"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function FilePreviewPanel({
  fileId,
  fileName,
  indexStatus,
}: FilePreviewPanelProps) {
  const [preview, setPreview] = React.useState<PreviewState>({
    status: "loading",
  });
  const [showPdf, setShowPdf] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setPreview({ status: "loading" });
      setShowPdf(false);
      try {
        const res = await fetch(`/api/files/${fileId}/preview`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          kind?: string;
          url?: string;
          pdfUrl?: string | null;
          chunks?: PreviewChunk[];
          fileType?: string;
          message?: string;
          indexStatus?: string;
        };

        if (cancelled) {
          return;
        }

        if (!res.ok) {
          setPreview({
            status: "error",
            message: data?.message ?? "Gagal memuat pratinjau.",
          });
          return;
        }

        if (data.kind === "pdf" && data.url) {
          setPreview({
            status: "ready",
            kind: "pdf",
            url: data.url,
            indexStatus: data.indexStatus ?? "none",
            message: data.message,
          });
          return;
        }

        if (data.kind === "chunks") {
          setPreview({
            status: "ready",
            kind: "chunks",
            chunks: Array.isArray(data.chunks) ? data.chunks : [],
            fileType: data.fileType ?? "document",
            pdfUrl: data.pdfUrl ?? null,
            indexStatus: data.indexStatus ?? "none",
            message: data.message,
          });
          return;
        }

        setPreview({
          status: "error",
          message: "Format pratinjau tidak dikenali.",
        });
      } catch {
        if (!cancelled) {
          setPreview({
            status: "error",
            message: "Gagal memuat pratinjau.",
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fileId, indexStatus]);

  if (preview.status === "loading") {
    return (
      <p className="text-muted-foreground text-sm">Memuat pratinjau…</p>
    );
  }

  if (preview.status === "error") {
    return <p className="text-destructive text-sm">{preview.message}</p>;
  }

  if (preview.kind === "pdf") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          PDF · {fileName}
          {preview.indexStatus !== "ready"
            ? ` · indeks: ${preview.indexStatus}`
            : null}
        </p>
        {preview.message ? (
          <p className="text-muted-foreground text-xs">{preview.message}</p>
        ) : null}
        <iframe
          title={`Pratinjau ${fileName}`}
          src={preview.url}
          className="min-h-[480px] flex-1 rounded-md border bg-muted/20"
          sandbox="allow-same-origin"
        />
      </div>
    );
  }

  const typeLabel =
    preview.fileType === "pdf"
      ? "PDF"
      : preview.fileType === "docx"
        ? "DOCX"
        : "Dokumen";

  if (preview.chunks.length === 0) {
    const emptyMessage =
      preview.message ??
      (preview.indexStatus === "failed"
        ? "Gagal mengindeks dokumen untuk pratinjau."
        : preview.indexStatus === "ready"
          ? "Indeks siap, tetapi belum ada chunk."
          : "Sedang mengindeks dokumen… Pratinjau chunk akan muncul setelah selesai.");

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          {typeLabel} · {fileName}
        </p>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        {preview.pdfUrl ? (
          <iframe
            title={`Pratinjau ${fileName}`}
            src={preview.pdfUrl}
            className="min-h-[360px] flex-1 rounded-md border bg-muted/20"
            sandbox="allow-same-origin"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {typeLabel} · {fileName} · {preview.chunks.length} chunk
        </p>
        {preview.pdfUrl ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowPdf((v) => !v)}
            >
              {showPdf ? "Sembunyikan PDF" : "Tampilkan PDF"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <a href={preview.pdfUrl} target="_blank" rel="noopener noreferrer">
                Buka PDF
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {preview.pdfUrl && showPdf ? (
        <iframe
          title={`PDF ${fileName}`}
          src={preview.pdfUrl}
          className="h-[280px] w-full shrink-0 rounded-md border bg-muted/20"
          sandbox="allow-same-origin"
        />
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
        )}
      >
        {preview.chunks.map((chunk) => (
          <ChunkCard key={chunk.chunkIndex} chunk={chunk} />
        ))}
      </div>
    </div>
  );
}
