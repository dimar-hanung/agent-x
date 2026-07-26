"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DigestSnapshotListItem } from "./snapshot-list";

interface SnapshotPanelProps {
  snapshot: DigestSnapshotListItem | null;
  isLoading: boolean;
  onRefresh: () => void;
}

function formatWindow(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  });

  return `${formatter.format(new Date(from))} – ${formatter.format(new Date(to))}`;
}

export function SnapshotPanel({
  snapshot,
  isLoading,
  onRefresh,
}: SnapshotPanelProps) {
  if (!snapshot) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Belum ada ringkasan</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Buat snapshot untuk merangkum semua chat aktif dalam 24 jam
              terakhir. Di atas 100 chat, sistem memproses per batch 100.
            </p>
          </div>
          <Button onClick={onRefresh} disabled={isLoading}>
            {isLoading ? "Memproses…" : "Buat ringkasan"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Snapshot semua chat</h2>
          <p className="text-muted-foreground text-sm">
            {snapshot.chatCount} chat · {snapshot.chunkCount} batch ·{" "}
            {formatWindow(snapshot.coversFrom, snapshot.coversTo)}
          </p>
        </div>
        <Button onClick={onRefresh} disabled={isLoading} size="sm">
          {isLoading ? "Memproses…" : "Perbarui ringkasan"}
        </Button>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-base">Ringkasan eksekutif</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="font-sans text-sm whitespace-pre-wrap">
            {snapshot.digestText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
