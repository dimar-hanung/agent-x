import {
  convertToModelMessages,
  generateId,
  type UIMessage,
} from "ai";

import { createChatAgent } from "@/lib/ai/agents/chat-agent";
import { prepareModelContext } from "@/lib/ai/context/prepare-model-context";
import { getUserById } from "@/lib/auth/get-user-by-id";
import { getOrCreateMainChannel } from "@/lib/db/repositories/channel-repository";
import {
  loadStoredChatMessages,
  saveChat,
} from "@/lib/db/repositories/chat-repository";
import { sendWhatsAppToUser } from "@/lib/integrations/whatsapp-channel-repository";
import { createAllToolsForUser } from "@/lib/ai/tools/resolve-tools";
import type { NativeToolKey } from "@/lib/ai/tools/tool-keys";

export type ChannelMessageSource = "web" | "whatsapp" | "scheduler";

const EXCLUDED_SCHEDULER_TOOL_KEYS: NativeToolKey[] = ["create_schedule"];

export interface ProcessChannelMessageInput {
  userId: string;
  text: string;
  source: ChannelMessageSource;
  metadata?: Record<string, unknown>;
  replyViaWhatsApp?: boolean;
}

export interface ProcessChannelMessageResult {
  assistantText: string;
  chatId: string;
}

export async function processChannelMessage(
  input: ProcessChannelMessageInput
): Promise<ProcessChannelMessageResult> {
  const user = await getUserById(input.userId);

  if (!user) {
    throw new Error("User tidak ditemukan.");
  }

  const chatId = await getOrCreateMainChannel(user.userId);
  const previousMessages = await loadStoredChatMessages(chatId, user.userId);

  const userMessage: UIMessage = {
    id: generateId(),
    role: "user",
    parts: [{ type: "text", text: input.text }],
    metadata: {
      source: input.source,
      ...input.metadata,
    },
  };

  const storedWithNew = [
    ...previousMessages,
    { ...userMessage, sequence: previousMessages.length },
  ];

  const excludeNativeKeys =
    input.source === "scheduler" ? EXCLUDED_SCHEDULER_TOOL_KEYS : undefined;

  const tools = await createAllToolsForUser(user, {
    excludeNativeKeys,
    runtimeContext: { userId: user.userId, chatId },
  });

  const { systemPrompt, modelMessages } = await prepareModelContext({
    chatId,
    user,
    allMessages: storedWithNew,
    whatsappOutput: true,
  });

  const agent = await createChatAgent(user, { userId: user.userId, chatId }, tools, {
    instructions: systemPrompt,
  });

  const result = await agent.generate({
    messages: await convertToModelMessages(modelMessages),
  });

  const assistantMessage: UIMessage = {
    id: generateId(),
    role: "assistant",
    parts: [{ type: "text", text: result.text }],
    metadata: {
      source: input.source,
      ...input.metadata,
    },
  };

  const allInputMessages = [
    ...previousMessages.map(({ sequence: _sequence, ...message }) => message),
    userMessage,
  ];

  await saveChat({
    chatId,
    userId: user.userId,
    allMessages: [...allInputMessages, assistantMessage],
  });

  if (input.source === "whatsapp" && input.replyViaWhatsApp) {
    await sendWhatsAppToUser(user.userId, result.text);
  } else if (input.source !== "whatsapp") {
    void sendWhatsAppToUser(user.userId, result.text).catch((error) => {
      console.error("Mirror WhatsApp gagal:", error);
    });
  }

  return {
    assistantText: result.text,
    chatId,
  };
}
