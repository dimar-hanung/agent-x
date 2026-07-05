import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { loadChatMessagesPage } from "@/lib/db/repositories/chat-repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = req.nextUrl;
  const limit = parsePositiveInt(searchParams.get("limit"), 30);
  const before = parseOptionalInt(searchParams.get("before"));
  const after = parseOptionalInt(searchParams.get("after"));

  try {
    const page = await loadChatMessagesPage(id, user.userId, {
      limit,
      before,
      after,
    });

    return NextResponse.json({
      messages: page.messages.map(({ sequence: _sequence, ...message }) => message),
      sequences: page.messages.map((message) => ({
        id: message.id,
        sequence: message.sequence,
      })),
      hasMore: page.hasMore,
      oldestSequence: page.oldestSequence,
    });
  } catch {
    return NextResponse.json({ message: "Chat tidak ditemukan." }, { status: 404 });
  }
}
