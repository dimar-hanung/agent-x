import { getToolProgressLabel } from "@/lib/ai/tools/tool-progress-labels";
import { formatWhatsAppToolError } from "@/lib/ai/tools/friendly-tool-error";
import { sendWhatsAppToUser } from "@/lib/integrations/whatsapp-channel-repository";

/**
 * Notify the user's WhatsApp that a tool started (progress / status line).
 * Failures are logged and swallowed so they never interrupt the agent.
 */
export async function notifyWhatsAppToolStart(
  userId: string,
  toolName: string
): Promise<void> {
  const label = getToolProgressLabel(toolName);

  try {
    await sendWhatsAppToUser(userId, label);
  } catch (error) {
    console.error("Mirror status tool WhatsApp gagal:", error);
  }
}

function extractToolErrorFields(toolOutput: {
  type: string;
  output?: unknown;
  error?: unknown;
}): { message: string; code: string | null } | null {
  if (toolOutput.type === "tool-error") {
    const error = toolOutput.error;
    if (typeof error === "string" && error.trim()) {
      return { message: error.trim(), code: null };
    }
    if (error instanceof Error && error.message.trim()) {
      return { message: error.message.trim(), code: null };
    }
    return { message: "", code: null };
  }

  if (toolOutput.type !== "tool-result") {
    return null;
  }

  const output = toolOutput.output;
  if (!output || typeof output !== "object") {
    return null;
  }

  const result = output as {
    success?: boolean;
    message?: string;
    code?: string;
  };
  if (result.success !== false) {
    return null;
  }

  return {
    message: typeof result.message === "string" ? result.message.trim() : "",
    code: typeof result.code === "string" ? result.code : null,
  };
}

/**
 * Notify WhatsApp when a tool fails (soft `success: false` or thrown error).
 * Message is mapped to non-technical Indonesian. No-op on success.
 */
export async function notifyWhatsAppToolError(
  userId: string,
  toolName: string,
  toolOutput: { type: string; output?: unknown; error?: unknown }
): Promise<void> {
  const fields = extractToolErrorFields(toolOutput);
  if (!fields) {
    return;
  }

  const text = formatWhatsAppToolError({
    toolName,
    message: fields.message,
    code: fields.code,
  });

  try {
    await sendWhatsAppToUser(userId, text);
  } catch (error) {
    console.error("Mirror error tool WhatsApp gagal:", error);
  }
}
