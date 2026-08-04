"use client";

import { useState } from "react";

import { MessageMarkdown } from "@/components/chat/message-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WhatsAppMessageSearchHit } from "@/lib/integrations/whatsapp-inbox/search/service";

interface SearchResponse {
  query: string;
  attemptedKeywords: string[];
  successfulKeywords: string[];
  results: WhatsAppMessageSearchHit[];
  analysisText: string;
  chatCount: number;
  chunkCount: number;
  messageCount: number;
  chatFilter: string | null;
  message?: string;
}

function formatSentAt(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function highlightKeyword(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  let matchIndex = -1;
  let matchLength = 0;

  for (const keyword of keywords) {
    const index = lower.indexOf(keyword.toLowerCase());
    if (index >= 0 && (matchIndex < 0 || index < matchIndex)) {
      matchIndex = index;
      matchLength = keyword.length;
    }
  }

  if (matchIndex < 0) {
    return text;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + matchLength);
  const after = text.slice(matchIndex + matchLength);

  return (
    <>
      {before}
      <mark className="bg-primary/15 rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

export function MessageSearchPanel() {
  const [query, setQuery] = useState("");
  const [chatFilter, setChatFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [showKeywords, setShowKeywords] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({ query: trimmedQuery });
      if (chatFilter.trim()) {
        params.set("chat", chatFilter.trim());
      }

      const result = await fetch(
        `/api/integrations/whatsapp/inbox/messages/search?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = (await result.json()) as SearchResponse;

      if (!result.ok) {
        setResponse(null);
        setError(data.message ?? "Gagal mencari pesan.");
        if (data.attemptedKeywords?.length) {
          setResponse({
            query: trimmedQuery,
            attemptedKeywords: data.attemptedKeywords,
            successfulKeywords: [],
            results: [],
            analysisText: "",
            chatCount: 0,
            chunkCount: 0,
            messageCount: 0,
            chatFilter: chatFilter.trim() || null,
          });
          setShowKeywords(true);
        }
        return;
      }

      setResponse(data);
      setShowKeywords(data.attemptedKeywords.length > 1);
    } catch {
      setError("Terjadi kesalahan saat mencari pesan.");
      setResponse(null);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <form onSubmit={handleSearch} className="flex shrink-0 flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="wa-search-query">Pertanyaan pencarian</Label>
            <Input
              id="wa-search-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Contoh: siapa yang bilang deadline Jumat?"
              disabled={isSearching}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-search-chat">Batasi ke chat (opsional)</Label>
            <Input
              id="wa-search-chat"
              value={chatFilter}
              onChange={(event) => setChatFilter(event.target.value)}
              placeholder="Nama, nomor, atau JID"
              disabled={isSearching}
            />
          </div>
          <Button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? "Mencari dan menganalisis…" : "Cari"}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Sistem membuat kata kunci secara otomatis (maks. 10 percobaan) lalu
          menganalisis pesan teks yang cocok.
        </p>
      </form>

      {error ? <p className="text-destructive shrink-0 text-sm">{error}</p> : null}

      {response?.attemptedKeywords.length ? (
        <Collapsible open={showKeywords} onOpenChange={setShowKeywords}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-fit px-0">
              Kata kunci dicoba ({response.attemptedKeywords.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-muted-foreground text-sm">
              {response.attemptedKeywords.join(", ")}
              {response.successfulKeywords.length > 0
                ? ` · berhasil: ${response.successfulKeywords.join(", ")}`
                : null}
            </p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {response?.analysisText ? (
        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardHeader className="shrink-0 border-b py-4">
            <CardTitle className="text-base">Analisis AI</CardTitle>
            <p className="text-muted-foreground text-sm">
              {response.messageCount} pesan · {response.chatCount} chat
              {response.chunkCount > 1
                ? ` · ${response.chunkCount} batch analisis`
                : null}
              {response.chatFilter ? ` · chat: ${response.chatFilter}` : null}
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <MessageMarkdown content={response.analysisText} />
          </CardContent>
        </Card>
      ) : null}

      {response?.results.length ? (
        <Card className="flex max-h-[40vh] min-h-0 flex-col gap-0 overflow-hidden py-0 lg:max-h-[320px]">
          <CardHeader className="shrink-0 border-b py-4">
            <CardTitle className="text-base">
              Pesan cocok ({response.results.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {response.results.map((hit) => (
              <div
                key={hit.messageId}
                className="border-border space-y-1 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {hit.chatName}{" "}
                    <span className="text-muted-foreground font-normal">
                      · {hit.chatType === "group" ? "Grup" : "DM"}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatSentAt(hit.sentAt)}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  {hit.senderName ??
                    (hit.direction === "outbound" ? "Saya" : "Kontak")}
                  {hit.matchedKeywords.length > 0
                    ? ` · cocok: ${hit.matchedKeywords.join(", ")}`
                    : null}
                </p>
                <p className="text-sm">
                  {highlightKeyword(hit.text, hit.matchedKeywords)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
