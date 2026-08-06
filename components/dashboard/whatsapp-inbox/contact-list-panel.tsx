"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface WhatsAppContactListItem {
  id: string;
  contactJid: string;
  displayName: string;
  phoneE164: string | null;
}

interface ContactListPanelProps {
  refreshToken?: number;
  onDirectorySyncedAt?: (value: string | null) => void;
}

export function ContactListPanel({
  refreshToken = 0,
  onDirectorySyncedAt,
}: ContactListPanelProps) {
  const [contacts, setContacts] = useState<WhatsAppContactListItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/integrations/whatsapp/inbox/contacts",
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        contacts?: WhatsAppContactListItem[];
        directorySyncedAt?: string | null;
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memuat kontak.");
        setContacts([]);
        return;
      }

      setContacts(data.contacts ?? []);
      onDirectorySyncedAt?.(data.directorySyncedAt ?? null);
    } catch {
      setError("Terjadi kesalahan saat memuat kontak.");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [onDirectorySyncedAt]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts, refreshToken]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const haystack = [
        contact.displayName,
        contact.phoneE164 ?? "",
        contact.contactJid,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [contacts, search]);

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="shrink-0 border-b py-4">
        <CardTitle className="text-base">Kontak</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="space-y-2">
          <Label htmlFor="contact-search">Cari kontak</Label>
          <Input
            id="contact-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nama atau nomor…"
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat kontak…</p>
        ) : filteredContacts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {contacts.length === 0 ? "Belum ada kontak." : "Tidak ada kontak yang cocok."}
          </p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {filteredContacts.map((contact) => (
              <li
                key={contact.id}
                className="bg-muted/40 rounded-lg border px-3 py-2"
              >
                <p className="font-medium">{contact.displayName}</p>
                <p className="text-muted-foreground text-sm">
                  {contact.phoneE164 ?? contact.contactJid}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
