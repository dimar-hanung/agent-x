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
  maxSteps?: number;
  modelId?: string;
  onToolExecutionStart?: OnToolExecutionStartCallback;
  onToolExecutionEnd?: OnToolExecutionEndCallback;
  reasoning?:
    | "provider-default"
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh";
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
    model: getChatModel(
      options?.modelId,
      options?.reasoning === "none"
        ? { reasoning: { enabled: false, effort: "none" } }
        : undefined
    ),
    instructions: options?.instructions ?? buildSystemPrompt(user),
    tools,
    stopWhen: isStepCount(options?.maxSteps ?? MAX_AGENT_STEPS),
    onToolExecutionStart: options?.onToolExecutionStart,
    onToolExecutionEnd: options?.onToolExecutionEnd,
    reasoning: options?.reasoning,
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
  modelId,
  toolsOverride,
  onToolExecutionStart,
  onToolExecutionEnd,
  reasoning,
}: {
  user: UserContext;
  chatId: string;
  instructions?: string;
  modelId?: string;
  toolsOverride?: Partial<Record<ToolKey, Tool>>;
  onToolExecutionStart?: OnToolExecutionStartCallback;
  onToolExecutionEnd?: OnToolExecutionEndCallback;
  reasoning?:
    | "provider-default"
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh";
}) {
  const runtimeContext = {
    userId: user.userId,
    chatId,
  } satisfies ChatAgentRuntimeContext;

  const agent = await createChatAgent(user, runtimeContext, toolsOverride, {
    instructions,
    modelId,
    onToolExecutionStart,
    onToolExecutionEnd,
    reasoning,
  });

  return {
    agent,
    runtimeContext,
  };
}
