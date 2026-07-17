"use client";

import { ArrowUp, Square } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import * as React from "react";

import { MessageRow } from "@/components/chat/message-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILE_SUGGESTIONS = [
  "Ringkas dokumen ini",
  "Apa poin utama dokumen?",
  "Ada risiko atau catatan penting?",
];

interface FileChatPanelProps {
  chatId: string;
  fileId: string;
  indexReady: boolean;
  indexStatus: string;
  initialMessages?: UIMessage[];
}

export function FileChatPanel({
  chatId,
  fileId,
  indexReady,
  indexStatus,
  initialMessages = [],
}: FileChatPanelProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id: sendChatId, messages: allMessages }) => ({
        body: {
          id: sendChatId,
          message: allMessages.at(-1),
          fileId,
        },
      }),
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";
  const canSend = indexReady && status === "ready" && input.trim().length > 0;

  const handleSend = () => {
    const text = input.trim();
    if (!text || !indexReady || isBusy) {
      return;
    }
    setInput("");
    void sendMessage({ text });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!indexReady ? (
        <div
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
          role="status"
        >
          {indexStatus === "failed"
            ? "Gagal mengindeks dokumen. Perbaiki unggahan atau hubungi admin."
            : "Sedang mengindeks dokumen… Anda bisa melihat pratinjau di kanan; kirim pertanyaan setelah indeks selesai."}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Jawaban berdasarkan isi dokumen ini (RAG).
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 py-2">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ajukan pertanyaan tentang isi dokumen.
            </p>
          ) : (
            messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                showInlineTyping={false}
              />
            ))
          )}
          {isBusy ? (
            <p className="text-muted-foreground text-sm">Mengetik…</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error.message || "Gagal mengirim pesan."}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILE_SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="outline"
            size="sm"
            disabled={!indexReady || isBusy}
            onClick={() => setInput(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          disabled={!indexReady || isBusy}
          placeholder={
            indexReady
              ? "Tanya tentang isi file…"
              : "Tunggu indeks selesai…"
          }
          className={cn(
            "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[44px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          )}
          aria-label="Pesan untuk file"
        />
        {isBusy ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => stop()}
            aria-label="Hentikan"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            disabled={!canSend}
            onClick={handleSend}
            aria-label="Kirim"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
