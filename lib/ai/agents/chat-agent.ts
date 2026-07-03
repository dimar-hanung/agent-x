import {
  ToolLoopAgent,
  isStepCount,
  type Tool,
  type ToolSet,
  type UIMessage,
} from "ai";

import { buildSystemPrompt, MAX_AGENT_STEPS } from "@/lib/ai/chat-config";
import { getChatModel } from "@/lib/ai/openrouter";
import type { UserContext } from "@/lib/ai/roles/types";
import { createAllToolsForUser } from "@/lib/ai/tools/resolve-tools";
import type { ToolKey } from "@/lib/ai/tools/tool-keys";

export interface ChatAgentRuntimeContext {
  userId: string;
  chatId: string;
}

export async function createChatAgent(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext,
  toolsOverride?: Partial<Record<ToolKey, Tool>>
) {
  const tools = (toolsOverride ??
    (await createAllToolsForUser(user, { runtimeContext }))) as ToolSet;

  return new ToolLoopAgent({
    model: getChatModel(),
    instructions: buildSystemPrompt(user),
    tools,
    stopWhen: isStepCount(MAX_AGENT_STEPS),
  });
}

export type ChatAgent = Awaited<ReturnType<typeof createChatAgent>>;

export interface RunChatAgentOptions {
  user: UserContext;
  chatId: string;
  messages: UIMessage[];
}

export async function createChatAgentForRun({
  user,
  chatId,
}: {
  user: UserContext;
  chatId: string;
}) {
  const runtimeContext = {
    userId: user.userId,
    chatId,
  } satisfies ChatAgentRuntimeContext;

  const agent = await createChatAgent(user, runtimeContext);

  return {
    agent,
    runtimeContext,
  };
}
