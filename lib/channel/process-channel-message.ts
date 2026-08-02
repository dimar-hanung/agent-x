import {
  convertToModelMessages,
  generateId,
  type UIMessage,
} from "ai";

import { getModelSettings } from "@/lib/admin/model-settings/repository";
import type { ModelSettingsView } from "@/lib/admin/model-settings/schemas";
import {
  buildMultimodalUserParts,
  resolveAgentModelId,
  stripFilePartsFromMessage,
} from "@/lib/ai/build-multimodal-parts";
import { createChatAgent } from "@/lib/ai/agents/chat-agent";
import { prepareModelContext } from "@/lib/ai/context/prepare-model-context";
import { WHATSAPP_MAX_AGENT_STEPS } from "@/lib/ai/chat-config";
import {
  decideWhatsAppVoiceReply,
  getVoiceConfig,
  synthesizeSpeech,
  type WhatsAppReplyMode,
} from "@/lib/ai/voice";
import { getUserById } from "@/lib/auth/get-user-by-id";
import { getOrCreateMainChannel } from "@/lib/db/repositories/channel-repository";
import {
  loadStoredChatMessages,
  saveChat,
} from "@/lib/db/repositories/chat-repository";
import {
  sendWhatsAppAudioToUser,
  sendWhatsAppToUser,
} from "@/lib/integrations/whatsapp-channel-repository";
import { clearDigestInFlight } from "@/lib/integrations/whatsapp-inbox/summary/service";
import { notifyWhatsAppToolError, notifyWhatsAppToolStart } from "@/lib/integrations/whatsapp/notify-tool-progress";
import type { WhatsAppSavedAttachment } from "@/lib/integrations/whatsapp/types";
import { createAllToolsForUser } from "@/lib/ai/tools/resolve-tools";
import type { NativeToolKey } from "@/lib/ai/tools/tool-keys";

export type ChannelMessageSource = "web" | "whatsapp" | "scheduler";

const EXCLUDED_SCHEDULER_TOOL_KEYS: NativeToolKey[] = ["create_schedule"];

const EXCLUDED_WHATSAPP_TOOL_KEYS: NativeToolKey[] = [
  "summarize_whatsapp_chat",
  "list_whatsapp_chats",
];

export interface ProcessChannelMessageInput {
  userId: string;
  text: string;
  source: ChannelMessageSource;
  attachments?: WhatsAppSavedAttachment[];
  metadata?: Record<string, unknown>;
  replyViaWhatsApp?: boolean;
  whatsappInputMode?: "text" | "voice";
  modelSettings?: ModelSettingsView;
  abortSignal?: AbortSignal;
}

export interface ProcessChannelMessageResult {
  assistantText: string;
  chatId: string;
  whatsappReplyMode?: WhatsAppReplyMode;
}

export async function processChannelMessage(
  input: ProcessChannelMessageInput
): Promise<ProcessChannelMessageResult> {
  const user = await getUserById(input.userId);

  if (!user) {
    throw new Error("User tidak ditemukan.");
  }

  const modelSettings = input.modelSettings ?? (await getModelSettings());
  const voiceConfig = getVoiceConfig(modelSettings);
  const attachments = input.attachments ?? [];
  const { parts, requiresVision } = buildMultimodalUserParts(
    input.text,
    attachments
  );
  const modelId = resolveAgentModelId({
    textModelId: modelSettings.textModelId,
    visionModelId: modelSettings.visionModelId,
    requiresVision,
  });

  const chatId = await getOrCreateMainChannel(user.userId);
  const previousMessages = await loadStoredChatMessages(chatId, user.userId);
  const historyWithoutFiles = previousMessages.map((message) => ({
    ...message,
    ...stripFilePartsFromMessage(message),
  }));

  const userMessage: UIMessage = {
    id: generateId(),
    role: "user",
    parts,
    metadata: {
      source: input.source,
      ...input.metadata,
    },
  };

  const storedWithNew = [
    ...historyWithoutFiles,
    { ...userMessage, sequence: previousMessages.length },
  ];

  const excludeNativeKeys =
    input.source === "scheduler"
      ? EXCLUDED_SCHEDULER_TOOL_KEYS
      : input.source === "whatsapp"
        ? EXCLUDED_WHATSAPP_TOOL_KEYS
        : undefined;

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

  const agent = await createChatAgent(user, { userId: user.userId, chatId }, tools, {
    instructions: systemPrompt,
    modelId,
    maxSteps: input.source === "whatsapp" ? WHATSAPP_MAX_AGENT_STEPS : undefined,
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

  let result;
  try {
    result = await agent.generate({
      messages: await convertToModelMessages(modelMessages),
      abortSignal: input.abortSignal,
      onStepEnd: async ({ text }) => {
        const trimmed = text.trim();
        if (!trimmed || replyViaWhatsApp) {
          return;
        }

        if (mirrorViaWhatsApp) {
          try {
            await sendWhatsAppToUser(user.userId, trimmed);
          } catch (error) {
            console.error("Mirror WhatsApp gagal:", error);
          }
        }
      },
    });
  } catch (error) {
    if (input.abortSignal?.aborted) {
      clearDigestInFlight(user.userId);
      return { assistantText: "", chatId };
    }

    throw error;
  }

  const assistantTextParts = result.steps
    .map((step) => step.text.trim())
    .filter((text) => text.length > 0);

  const finalAssistantText =
    assistantTextParts.length > 0
      ? assistantTextParts.join("\n\n")
      : result.text.trim();

  const toolNames = result.steps.flatMap((step) =>
    step.toolCalls.map((toolCall) => toolCall.toolName)
  );
  const voiceReplyDecision = replyViaWhatsApp
    ? decideWhatsAppVoiceReply(
        {
          inputWasVoice: input.whatsappInputMode === "voice",
          userText: input.text,
          assistantText: finalAssistantText,
          toolNames,
        },
        voiceConfig
      )
    : undefined;

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
      ...(voiceReplyDecision
        ? {
            deliveryMode: voiceReplyDecision.mode,
            voicePolicyReason: voiceReplyDecision.reason,
            voiceProbabilityPercent: Math.round(
              voiceConfig.replyProbability * 100
            ),
          }
        : {}),
    },
  };

  const allInputMessages = [
    ...historyWithoutFiles.map(({ sequence: _sequence, ...message }) => message),
    stripFilePartsFromMessage(userMessage),
  ];

  await saveChat({
    chatId,
    userId: user.userId,
    allMessages: [...allInputMessages, assistantMessage],
  });

  let whatsappReplyMode = voiceReplyDecision?.mode;

  if (replyViaWhatsApp && finalAssistantText) {
    if (input.abortSignal?.aborted) {
      return { assistantText: "", chatId };
    }

    if (voiceReplyDecision?.mode === "voice") {
      try {
        const audio = await synthesizeSpeech(
          finalAssistantText,
          voiceConfig,
          input.abortSignal
        );

        await sendWhatsAppAudioToUser(user.userId, {
          base64: audio.base64,
          encoding: true,
        });
      } catch (error) {
        if (input.abortSignal?.aborted) {
          return { assistantText: "", chatId };
        }

        console.error("Balasan suara WhatsApp gagal:", error);
        whatsappReplyMode = "text";
        await sendWhatsAppToUser(user.userId, finalAssistantText);
      }
    } else {
      await sendWhatsAppToUser(user.userId, finalAssistantText);
    }
  }

  return {
    assistantText: finalAssistantText,
    chatId,
    whatsappReplyMode,
  };
}
