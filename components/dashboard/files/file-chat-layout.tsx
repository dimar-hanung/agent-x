"use client";

import Link from "next/link";
import * as React from "react";

import { FileChatPanel } from "@/components/dashboard/files/file-chat-panel";
import { FilePreviewPanel } from "@/components/dashboard/files/file-preview-panel";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/lib/site-config";
import type { UIMessage } from "ai";

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
  const [indexStatus, setIndexStatus] = React.useState(initialIndexStatus);

  React.useEffect(() => {
    if (indexStatus === "ready" || indexStatus === "failed") {
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
        const data = (await res.json()) as { status?: string };
        if (data.status) {
          setIndexStatus(data.status);
        }
      } catch {
        // ignore poll errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fileId, indexStatus]);

  const indexReady = indexStatus === "ready";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {fileName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Tanya isi file · status indeks:{" "}
            <span className="font-medium text-foreground">{indexStatus}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={appRoutes.files}>Kembali ke File</Link>
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <section
          className="flex min-h-[420px] flex-col rounded-lg border bg-card p-4"
          aria-label="Chat file"
        >
          <h2 className="mb-3 text-sm font-medium">Chat</h2>
          <FileChatPanel
            chatId={chatId}
            fileId={fileId}
            indexReady={indexReady}
            indexStatus={indexStatus}
            initialMessages={initialMessages}
          />
        </section>
        <section
          className="flex min-h-[420px] flex-col rounded-lg border bg-card p-4"
          aria-label="Pratinjau file"
        >
          <h2 className="mb-3 text-sm font-medium">Pratinjau</h2>
          <FilePreviewPanel
            fileId={fileId}
            fileName={fileName}
            indexStatus={indexStatus}
          />
        </section>
      </div>
    </div>
  );
}
