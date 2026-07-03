import {
  createAgentUIStreamResponse,
  createIdGenerator,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { createChatAgentForRun } from "@/lib/ai/agents/chat-agent";
import { maxDuration } from "@/lib/ai/chat-config";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { isOpenRouterConfigured } from "@/lib/ai/openrouter";
import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { createAllToolsForUser } from "@/lib/ai/tools/resolve-tools";
import {
  createChatWithId,
  getChatOwner,
  loadChatMessages,
  saveChat,
} from "@/lib/db/repositories/chat-repository";

export { maxDuration };

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid chat request.",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { message: "OpenRouter is not configured." },
      { status: 503 }
    );
  }

  try {
    const user = await resolveUser();
    const { id: chatId, message } = parsed.data;

    const ownerUserId = await getChatOwner(chatId);

    if (ownerUserId === null) {
      await createChatWithId(user.userId, chatId);
    } else if (ownerUserId !== user.userId) {
      return NextResponse.json({ message: "Chat not found." }, { status: 404 });
    }

    const previousMessages = await loadChatMessages(chatId, user.userId);
    const messages = [...previousMessages, message as UIMessage];

    const runtimeContext = { userId: user.userId, chatId };

    const tools = await createAllToolsForUser(user, { runtimeContext });
    const validatedMessages = await validateUIMessages({
      messages,
      tools: tools as Record<string, never>,
    });

    const { agent } = await createChatAgentForRun({
      user,
      chatId,
    });

    return createAgentUIStreamResponse({
      agent,
      uiMessages: validatedMessages as never,
      originalMessages: validatedMessages as never,
      generateMessageId: createIdGenerator({
        prefix: "msg",
        size: 16,
      }),
      onEnd: async ({ messages: allMessages }) => {
        await saveChat({
          chatId,
          userId: user.userId,
          allMessages: allMessages as UIMessage[],
        });
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("POST /api/chat error:", error);
    return NextResponse.json(
      { message: "Failed to generate a response." },
      { status: 500 }
    );
  }
}
