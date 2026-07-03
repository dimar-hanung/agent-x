import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  createChat,
  listChatsForUser,
} from "@/lib/db/repositories/chat-repository";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const chats = await listChatsForUser(user.userId);

  return NextResponse.json({
    chats: chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt.toISOString(),
    })),
  });
}

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const chatId = await createChat(user.userId);

  return NextResponse.json({ id: chatId });
}
