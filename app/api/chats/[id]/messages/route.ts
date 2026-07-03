import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { loadChatMessages } from "@/lib/db/repositories/chat-repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const messages = await loadChatMessages(id, user.userId);

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ message: "Chat tidak ditemukan." }, { status: 404 });
  }
}
