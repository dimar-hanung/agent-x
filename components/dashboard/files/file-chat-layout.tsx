"use client";

import Link from "next/link";
import * as React from "react";

import { FileChatPanel } from "@/components/dashboard/files/file-chat-panel";
import { FilePreviewPanel } from "@/components/dashboard/files/file-preview-panel";
import { Button } from "@/components/ui/button";
import {
  formatFileIndexProgressLabel,
  fileIndexProgressPercent,
} from "@/lib/files/constants";
import { appRoutes } from "@/lib/site-config";
import type { UIMessage } from "ai";

interface IndexPollState {
  status: string;
  progressPhase: string | null;
  progressCurrent: number | null;
  progressTotal: number | null;
}

interface FileChatLayoutProps {
  fileId: string;
  fileName: string;
  chatId: string;
  initialIndexStatus: string;
  initialMessages: UIMessage[];
}

export function FileChatLayout({
  fileId,
  fileName,
  chatId,
  initialIndexStatus,
  initialMessages,
}: FileChatLayoutProps) {
  const [indexState, setIndexState] = React.useState<IndexPollState>({
    status: initialIndexStatus,
    progressPhase: initialIndexStatus === "pending" ? "queued" : null,
    progressCurrent: null,
    progressTotal: null,
  });

  React.useEffect(() => {
    if (indexState.status === "ready" || indexState.status === "failed") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/files/${fileId}/index`, {
          cache: "no-store",
        });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          status?: string;
          progressPhase?: string | null;
          progressCurrent?: number | null;
          progressTotal?: number | null;
        };
        if (data.status) {
          setIndexState({
            status: data.status,
            progressPhase: data.progressPhase ?? null,
            progressCurrent: data.progressCurrent ?? null,
            progressTotal: data.progressTotal ?? null,
          });
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fileId, indexState.status]);

  const indexReady = indexState.status === "ready";
  const progressLabel = formatFileIndexProgressLabel(
    indexState.progressPhase,
    indexState.progressCurrent,
    indexState.progressTotal
  );
  const progressPercent = fileIndexProgressPercent(
    indexState.progressCurrent,
    indexState.progressTotal
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {fileName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Tanya isi file ·{" "}
            {indexReady ? (
              <span className="font-medium text-foreground">Indeks siap</span>
            ) : indexState.status === "failed" ? (
              <span className="font-medium text-destructive">Indeks gagal</span>
            ) : (
              <span className="font-medium text-foreground">{progressLabel}</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={appRoutes.files}>Kembali ke File</Link>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <section
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card p-4"
          aria-label="Chat file"
        >
          <h2 className="mb-3 shrink-0 text-sm font-medium">Chat</h2>
          <FileChatPanel
            chatId={chatId}
            fileId={fileId}
            indexReady={indexReady}
            indexStatus={indexState.status}
            progressLabel={progressLabel}
            progressPercent={progressPercent}
            initialMessages={initialMessages}
          />
        </section>
        <section
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card p-4"
          aria-label="Pratinjau file"
        >
          <h2 className="mb-3 shrink-0 text-sm font-medium">Pratinjau</h2>
          <FilePreviewPanel
            fileId={fileId}
            fileName={fileName}
            indexStatus={indexState.status}
          />
        </section>
      </div>
    </div>
  );
}
