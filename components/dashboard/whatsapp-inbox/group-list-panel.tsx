"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface WhatsAppGroupListItem {
  id: string;
  groupJid: string;
  displayName: string;
  participantCount: number | null;
}

interface GroupListPanelProps {
  refreshToken?: number;
  onDirectorySyncedAt?: (value: string | null) => void;
}

export function GroupListPanel({
  refreshToken = 0,
  onDirectorySyncedAt,
}: GroupListPanelProps) {
  const [groups, setGroups] = useState<WhatsAppGroupListItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/whatsapp/inbox/groups", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        groups?: WhatsAppGroupListItem[];
        directorySyncedAt?: string | null;
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memuat grup.");
        setGroups([]);
        return;
      }

      setGroups(data.groups ?? []);
      onDirectorySyncedAt?.(data.directorySyncedAt ?? null);
    } catch {
      setError("Terjadi kesalahan saat memuat grup.");
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [onDirectorySyncedAt]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups, refreshToken]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return groups;
    }

    return groups.filter((group) => {
      const haystack = [group.displayName, group.groupJid].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [groups, search]);

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="shrink-0 border-b py-4">
        <CardTitle className="text-base">Grup</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="space-y-2">
          <Label htmlFor="group-search">Cari grup</Label>
          <Input
            id="group-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nama grup…"
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat grup…</p>
        ) : filteredGroups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {groups.length === 0 ? "Belum ada grup." : "Tidak ada grup yang cocok."}
          </p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {filteredGroups.map((group) => (
              <li
                key={group.id}
                className="bg-muted/40 rounded-lg border px-3 py-2"
              >
                <p className="font-medium">{group.displayName}</p>
                <p className="text-muted-foreground text-sm">
                  {group.groupJid}
                  {group.participantCount != null
                    ? ` · ${group.participantCount} anggota`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
