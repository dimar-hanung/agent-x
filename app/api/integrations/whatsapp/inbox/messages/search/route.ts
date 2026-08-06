import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { searchAndAnalyzeWhatsAppMessages } from "@/lib/integrations/whatsapp-inbox/search/analyze";
import type { WhatsAppSearchProgressEvent } from "@/lib/integrations/whatsapp-inbox/search/progress";

function requireClientOrAdmin(role: string) {
  return role === "client" || role === "admin";
}

function parseKeywords(searchParams: URLSearchParams): string[] {
  const repeated = searchParams.getAll("q").flatMap((value) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  );

  if (repeated.length > 0) {
    return repeated;
  }

  const query = searchParams.get("query")?.trim();
  return query ? [query] : [];
}

type SearchStreamEvent =
  | WhatsAppSearchProgressEvent
  | {
      type: "done";
      query: string;
      attemptedKeywords: string[];
      successfulKeywords: string[];
      results: unknown[];
      analysisText: string;
      chatCount: number;
      chunkCount: number;
      messageCount: number;
      chatFilter: string | null;
    }
  | {
      type: "error";
      message: string;
      attemptedKeywords: string[];
    };

export async function GET(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const queryParts = parseKeywords(searchParams);

  if (queryParts.length === 0) {
    return NextResponse.json(
      { message: "Parameter query wajib diisi." },
      { status: 400 }
    );
  }

  const query = queryParts.join(" ");
  const chat = searchParams.get("chat")?.trim() || undefined;
  const sinceRaw = searchParams.get("since")?.trim();
  const since = sinceRaw ? new Date(sinceRaw) : undefined;
  const stream = searchParams.get("stream") === "1";

  if (!stream) {
    const result = await searchAndAnalyzeWhatsAppMessages(user.userId, {
      query,
      chatQuery: chat,
      since,
      abortSignal: req.signal,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.message,
          attemptedKeywords: result.attemptedKeywords,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      query: result.query,
      attemptedKeywords: result.attemptedKeywords,
      successfulKeywords: result.successfulKeywords,
      results: result.results,
      analysisText: result.analysisText,
      chatCount: result.chatCount,
      chunkCount: result.chunkCount,
      messageCount: result.messageCount,
      chatFilter: result.chatFilter,
    });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: SearchStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const result = await searchAndAnalyzeWhatsAppMessages(user.userId, {
          query,
          chatQuery: chat,
          since,
          abortSignal: req.signal,
          onProgress: async (event) => {
            send(event);
          },
        });

        if (!result.success) {
          send({
            type: "error",
            message: result.message,
            attemptedKeywords: result.attemptedKeywords,
          });
          return;
        }

        send({
          type: "done",
          query: result.query,
          attemptedKeywords: result.attemptedKeywords,
          successfulKeywords: result.successfulKeywords,
          results: result.results,
          analysisText: result.analysisText,
          chatCount: result.chatCount,
          chunkCount: result.chunkCount,
          messageCount: result.messageCount,
          chatFilter: result.chatFilter,
        });
      } catch (error) {
        if (req.signal.aborted) {
          send({
            type: "error",
            message: "Pencarian dibatalkan.",
            attemptedKeywords: [],
          });
          return;
        }

        console.error("WhatsApp inbox search stream gagal:", error);
        send({
          type: "error",
          message: "Terjadi kesalahan saat mencari pesan.",
          attemptedKeywords: [],
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
