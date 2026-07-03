import {
  convertToModelMessages,
  generateId,
  type UIMessage,
} from "ai";

import { createChatAgent } from "@/lib/ai/agents/chat-agent";
import { getUserById } from "@/lib/auth/get-user-by-id";
import {
  createChat,
  loadChatMessages,
  saveChat,
} from "@/lib/db/repositories/chat-repository";
import {
  getScheduledJobById,
  markJobRun,
  updateScheduledJobChatId,
} from "@/lib/db/repositories/schedule-repository";
import type { ScheduleKind } from "@/lib/db/repositories/schedule-repository";
import { createAllToolsForUser } from "@/lib/ai/tools/resolve-tools";
import type { NativeToolKey } from "@/lib/ai/tools/tool-keys";

const SCHEDULED_RUN_PREFIX = "Ini eksekusi terjadwal:\n\n";

const EXCLUDED_SCHEDULED_TOOL_KEYS: NativeToolKey[] = ["create_schedule"];

export async function runScheduledPrompt(jobId: string): Promise<void> {
  const job = await getScheduledJobById(jobId);

  if (!job || job.status !== "active") {
    return;
  }

  const user = await getUserById(job.userId);

  if (!user) {
    await markJobRun({
      jobId,
      success: false,
      error: "User tidak ditemukan.",
      scheduleKind: job.scheduleKind as ScheduleKind,
    });
    return;
  }

  try {
    let chatId = job.chatId;

    if (!chatId) {
      chatId = await createChat(user.userId);
      await updateScheduledJobChatId(jobId, chatId);
    }

    const previousMessages = await loadChatMessages(chatId, user.userId);
    const scheduledUserMessage: UIMessage = {
      id: generateId(),
      role: "user",
      parts: [
        {
          type: "text",
          text: `${SCHEDULED_RUN_PREFIX}${job.prompt}`,
        },
      ],
    };

    const allInputMessages = [...previousMessages, scheduledUserMessage];
    const tools = await createAllToolsForUser(user, {
      excludeNativeKeys: EXCLUDED_SCHEDULED_TOOL_KEYS,
    });
    const agent = await createChatAgent(user, undefined, tools);
    const result = await agent.generate({
      messages: await convertToModelMessages(allInputMessages),
    });

    const assistantMessage: UIMessage = {
      id: generateId(),
      role: "assistant",
      parts: [{ type: "text", text: result.text }],
    };

    await saveChat({
      chatId,
      userId: user.userId,
      allMessages: [...allInputMessages, assistantMessage],
    });

    await markJobRun({
      jobId,
      success: true,
      scheduleKind: job.scheduleKind as ScheduleKind,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menjalankan jadwal.";

    await markJobRun({
      jobId,
      success: false,
      error: message,
      scheduleKind: job.scheduleKind as ScheduleKind,
    });

    throw error;
  }
}
