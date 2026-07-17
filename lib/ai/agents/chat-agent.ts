import {
  ToolLoopAgent,
  isStepCount,
  type OnToolExecutionEndCallback,
  type OnToolExecutionStartCallback,
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

export interface CreateChatAgentOptions {
  instructions?: string;
  onToolExecutionStart?: OnToolExecutionStartCallback;
  onToolExecutionEnd?: OnToolExecutionEndCallback;
}

export async function createChatAgent(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext,
  toolsOverride?: Partial<Record<ToolKey, Tool>>,
  options?: CreateChatAgentOptions
) {
  const tools = (toolsOverride ??
    (await createAllToolsForUser(user, { runtimeContext }))) as ToolSet;

  return new ToolLoopAgent({
    model: getChatModel(),
    instructions: options?.instructions ?? buildSystemPrompt(user),
    tools,
    stopWhen: isStepCount(MAX_AGENT_STEPS),
    onToolExecutionStart: options?.onToolExecutionStart,
    onToolExecutionEnd: options?.onToolExecutionEnd,
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
  instructions,
  toolsOverride,
  onToolExecutionStart,
  onToolExecutionEnd,
}: {
  user: UserContext;
  chatId: string;
  instructions?: string;
  toolsOverride?: Partial<Record<ToolKey, Tool>>;
  onToolExecutionStart?: OnToolExecutionStartCallback;
  onToolExecutionEnd?: OnToolExecutionEndCallback;
}) {
  const runtimeContext = {
    userId: user.userId,
    chatId,
  } satisfies ChatAgentRuntimeContext;

  const agent = await createChatAgent(user, runtimeContext, toolsOverride, {
    instructions,
    onToolExecutionStart,
    onToolExecutionEnd,
  });

  return {
    agent,
    runtimeContext,
  };
}
