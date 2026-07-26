"use client";

import { cn } from "@/lib/utils";

export interface DigestSnapshotListItem {
  id: string;
  digestText: string;
  chatCount: number;
  chunkCount: number;
  coversFrom: string;
  coversTo: string;
  generatedAt: string;
}

interface SnapshotListProps {
  snapshots: DigestSnapshotListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatSnapshotLabel(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function SnapshotList({
  snapshots,
  selectedId,
  onSelect,
}: SnapshotListProps) {
  if (snapshots.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        Belum ada snapshot tersimpan.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {snapshots.map((snapshot, index) => {
        const active = snapshot.id === selectedId;

        return (
          <button
            key={snapshot.id}
            type="button"
            onClick={() => onSelect(snapshot.id)}
            className={cn(
              "hover:bg-muted/50 w-full px-4 py-3 text-left transition-colors",
              active && "bg-muted"
            )}
          >
            <p className="text-sm font-medium">
              {formatSnapshotLabel(snapshot.generatedAt)}
            </p>
            <p className="text-muted-foreground text-xs">
              {snapshot.chatCount} chat · {snapshot.chunkCount} batch
              {index === 0 ? " · Terbaru" : ""}
            </p>
          </button>
        );
      })}
    </div>
  );
}
