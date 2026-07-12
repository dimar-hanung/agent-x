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
import { notifyWhatsAppToolError, notifyWhatsAppToolStart } from "@/lib/integrations/whatsapp/notify-tool-progress";
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

  const replyViaWhatsApp =
    input.source === "whatsapp" && Boolean(input.replyViaWhatsApp);
  const mirrorViaWhatsApp = input.source !== "whatsapp";
  const notifyToolProgress = replyViaWhatsApp || mirrorViaWhatsApp;

  // #region agent log
  fetch('http://localhost:7290/ingest/dd2ac6a0-2684-40fc-8133-4176bd7c2469',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5803d0'},body:JSON.stringify({sessionId:'5803d0',runId:'pre-fix',hypothesisId:'C',location:'process-channel-message.ts:flags',message:'channel message WA flags',data:{source:input.source,replyViaWhatsApp,mirrorViaWhatsApp,jobId:input.metadata?.jobId ?? null,chatId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const agent = await createChatAgent(user, { userId: user.userId, chatId }, tools, {
    instructions: systemPrompt,
    onToolExecutionStart: notifyToolProgress
      ? async ({ toolCall }) => {
          await notifyWhatsAppToolStart(user.userId, toolCall.toolName);
        }
      : undefined,
    onToolExecutionEnd: notifyToolProgress
      ? async ({ toolCall, toolOutput }) => {
          await notifyWhatsAppToolError(
            user.userId,
            toolCall.toolName,
            toolOutput
          );
        }
      : undefined,
  });

  const result = await agent.generate({
    messages: await convertToModelMessages(modelMessages),
    onStepEnd: async ({ text }) => {
      const trimmed = text.trim();
      if (!trimmed) {
        // #region agent log
        fetch('http://localhost:7290/ingest/dd2ac6a0-2684-40fc-8133-4176bd7c2469',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5803d0'},body:JSON.stringify({sessionId:'5803d0',runId:'pre-fix',hypothesisId:'C',location:'process-channel-message.ts:onStepEnd',message:'skip empty step text',data:{source:input.source,jobId:input.metadata?.jobId ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return;
      }

      // #region agent log
      fetch('http://localhost:7290/ingest/dd2ac6a0-2684-40fc-8133-4176bd7c2469',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5803d0'},body:JSON.stringify({sessionId:'5803d0',runId:'pre-fix',hypothesisId:'C',location:'process-channel-message.ts:onStepEnd',message:'step text ready for WA',data:{source:input.source,replyViaWhatsApp,mirrorViaWhatsApp,textLen:trimmed.length,jobId:input.metadata?.jobId ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (replyViaWhatsApp) {
        await sendWhatsAppToUser(user.userId, trimmed);
        return;
      }

      if (mirrorViaWhatsApp) {
        try {
          await sendWhatsAppToUser(user.userId, trimmed);
        } catch (error) {
          // #region agent log
          fetch('http://localhost:7290/ingest/dd2ac6a0-2684-40fc-8133-4176bd7c2469',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5803d0'},body:JSON.stringify({sessionId:'5803d0',runId:'pre-fix',hypothesisId:'D',location:'process-channel-message.ts:onStepEnd',message:'mirror WA threw',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          console.error("Mirror WhatsApp gagal:", error);
        }
      }
    },
  });

  const assistantTextParts = result.steps
    .map((step) => step.text.trim())
    .filter((text) => text.length > 0);

  const assistantMessage: UIMessage = {
    id: generateId(),
    role: "assistant",
    parts:
      assistantTextParts.length > 0
        ? assistantTextParts.map((text) => ({ type: "text" as const, text }))
        : [{ type: "text", text: result.text }],
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

  return {
    assistantText:
      assistantTextParts.length > 0
        ? assistantTextParts.join("\n\n")
        : result.text,
    chatId,
  };
}
