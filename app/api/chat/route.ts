import {
  createAgentUIStreamResponse,
  createIdGenerator,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { createChatAgentForRun } from "@/lib/ai/agents/chat-agent";
import { prepareModelContext } from "@/lib/ai/context/prepare-model-context";
import { maxDuration } from "@/lib/ai/chat-config";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { isOpenRouterConfigured } from "@/lib/ai/openrouter";
import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { createAllToolsForUser } from "@/lib/ai/tools/resolve-tools";
import { isMainChannel } from "@/lib/db/repositories/channel-repository";
import {
  createChatWithId,
  getChatOwner,
  loadStoredChatMessages,
  saveChat,
} from "@/lib/db/repositories/chat-repository";
import { sendWhatsAppToUser } from "@/lib/integrations/whatsapp-channel-repository";
import { notifyWhatsAppToolError, notifyWhatsAppToolStart } from "@/lib/integrations/whatsapp/notify-tool-progress";

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

    const storedMessages = await loadStoredChatMessages(chatId, user.userId);
    const fullMessages: UIMessage[] = [
      ...storedMessages.map(({ sequence: _sequence, ...msg }) => msg),
      message as UIMessage,
    ];

    const storedWithNew = [
      ...storedMessages,
      {
        ...(message as UIMessage),
        sequence: storedMessages.length,
      },
    ];

    const whatsappOutput = await isMainChannel(chatId);

    const { systemPrompt, modelMessages } = await prepareModelContext({
      chatId,
      user,
      allMessages: storedWithNew,
      whatsappOutput,
    });

    const runtimeContext = { userId: user.userId, chatId };

    const tools = await createAllToolsForUser(user, { runtimeContext });

    const validatedModelMessages = await validateUIMessages({
      messages: modelMessages,
      tools: tools as Record<string, never>,
    });

    const validatedFullMessages = await validateUIMessages({
      messages: fullMessages,
      tools: tools as Record<string, never>,
    });

    const { agent } = await createChatAgentForRun({
      user,
      chatId,
      instructions: systemPrompt,
      onToolExecutionStart: whatsappOutput
        ? async ({ toolCall }) => {
            await notifyWhatsAppToolStart(user.userId, toolCall.toolName);
          }
        : undefined,
      onToolExecutionEnd: whatsappOutput
        ? async ({ toolCall, toolOutput }) => {
            await notifyWhatsAppToolError(
              user.userId,
              toolCall.toolName,
              toolOutput
            );
          }
        : undefined,
    });

    return createAgentUIStreamResponse({
      agent,
      uiMessages: validatedModelMessages as never,
      originalMessages: validatedFullMessages as never,
      abortSignal: req.signal,
      generateMessageId: createIdGenerator({
        prefix: "msg",
        size: 16,
      }),
      onStepEnd: async ({ text }) => {
        if (!whatsappOutput) {
          return;
        }

        const trimmed = text.trim();
        if (!trimmed) {
          return;
        }

        try {
          await sendWhatsAppToUser(user.userId, trimmed);
        } catch (error) {
          console.error("Mirror WhatsApp gagal:", error);
        }
      },
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
