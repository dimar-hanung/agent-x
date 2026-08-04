import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { searchAndAnalyzeWhatsAppMessages } from "@/lib/integrations/whatsapp-inbox/search/analyze";

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
