"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WhatsAppUserInstanceView } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

import {
  SnapshotList,
  type DigestSnapshotListItem,
} from "./snapshot-list";
import { SnapshotPanel } from "./snapshot-panel";

interface InboxWorkspaceProps {
  initialInstance: WhatsAppUserInstanceView;
  initialSnapshots: DigestSnapshotListItem[];
}

export function InboxWorkspace({
  initialInstance,
  initialSnapshots,
}: InboxWorkspaceProps) {
  const [instance] = useState(initialInstance);
  const [snapshots, setSnapshots] =
    useState<DigestSnapshotListItem[]>(initialSnapshots);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSnapshots[0]?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const connected = instance.status === "connected";
  const selectedSnapshot =
    snapshots.find((snapshot) => snapshot.id === selectedId) ?? null;

  const refreshSnapshotList = useCallback(async () => {
    const response = await fetch(
      "/api/integrations/whatsapp/inbox/digest?list=1&limit=20",
      { cache: "no-store" }
    );
    const data = (await response.json()) as {
      snapshots?: DigestSnapshotListItem[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Gagal memuat snapshot.");
    }

    const nextSnapshots = data.snapshots ?? [];
    setSnapshots(nextSnapshots);
    setSelectedId((current) => {
      if (current && nextSnapshots.some((snapshot) => snapshot.id === current)) {
        return current;
      }

      return nextSnapshots[0]?.id ?? null;
    });
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/whatsapp/inbox/digest", {
        method: "POST",
      });
      const data = (await response.json()) as DigestSnapshotListItem & {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal membuat ringkasan.");
        return;
      }

      await refreshSnapshotList();
      setSelectedId(data.id);
    } catch {
      setError("Terjadi kesalahan saat merangkum.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!connected) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="text-muted-foreground text-sm">
            WhatsApp pribadi belum terhubung. Hubungkan dulu untuk melihat
            ringkasan chat.
          </p>
          <Button asChild>
            <Link href="/dashboard/settings">Buka Settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Terhubung{instance.phoneE164 ? ` · ${instance.phoneE164}` : ""}
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating
            ? "Memproses…"
            : snapshots.length > 0
              ? "Perbarui ringkasan"
              : "Buat ringkasan"}
        </Button>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="grid min-h-[560px] gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SnapshotList
              snapshots={snapshots}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </CardContent>
        </Card>

        <Card className="p-4">
          <SnapshotPanel
            snapshot={selectedSnapshot}
            isLoading={isGenerating}
            onRefresh={handleGenerate}
          />
        </Card>
      </div>
    </div>
  );
}
