import type { UIMessage } from "ai";

import { isVisionModelEnabled } from "@/lib/admin/model-settings/constants";
import { isIndexableFile } from "@/lib/files/constants";
import type { WhatsAppSavedAttachment } from "@/lib/integrations/whatsapp/types";

export interface MultimodalBuildResult {
  parts: UIMessage["parts"];
  requiresVision: boolean;
}

function buildWaAttachmentStub(attachment: WhatsAppSavedAttachment): string {
  const indexable = isIndexableFile(attachment.mimeType, attachment.fileName);
  const indexNote = indexable ? " | indeks PDF/DOCX dijadwalkan" : "";

  return `[Lampiran WhatsApp tersimpan: ${attachment.fileName} | file_id=${attachment.fileId}${indexNote}]`;
}

function buildAttachmentTextBlock(attachments: WhatsAppSavedAttachment[]): string {
  const lines: string[] = [];

  for (const attachment of attachments) {
    const stub = buildWaAttachmentStub(attachment);

    if (attachment.textContent) {
      lines.push(`${stub}\n${attachment.textContent}`);
      continue;
    }

    lines.push(stub);
  }

  return lines.join("\n\n");
}

export function buildMultimodalUserParts(
  text: string,
  attachments: WhatsAppSavedAttachment[] = []
): MultimodalBuildResult {
  const parts: UIMessage["parts"] = [];
  const trimmedText = text.trim();
  const attachmentText = buildAttachmentTextBlock(attachments);
  const combinedText = [trimmedText, attachmentText].filter(Boolean).join("\n\n");

  if (combinedText) {
    parts.push({ type: "text", text: combinedText });
  }

  let requiresVision = false;

  for (const attachment of attachments) {
    if (!attachment.requiresVision || !attachment.dataUrl) {
      continue;
    }

    requiresVision = true;
    parts.push({
      type: "file",
      mediaType: attachment.mimeType,
      filename: attachment.fileName,
      url: attachment.dataUrl,
    });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", text: "(lampiran WhatsApp)" });
  }

  return { parts, requiresVision };
}

/** Remove binary file parts; keep text-only for chat history and context. */
export function stripFilePartsFromMessage(message: UIMessage): UIMessage {
  const hasFile = message.parts.some((part) => part.type === "file");

  if (!hasFile) {
    return message;
  }

  const textParts = message.parts.filter(
    (part): part is { type: "text"; text: string } =>
      part.type === "text" && typeof part.text === "string"
  );

  if (textParts.length > 0) {
    return { ...message, parts: textParts };
  }

  return {
    ...message,
    parts: [{ type: "text", text: "(lampiran WhatsApp)" }],
  };
}

export function resolveAgentModelId(options: {
  textModelId: string;
  visionModelId: string;
  requiresVision: boolean;
}): string {
  if (options.requiresVision && isVisionModelEnabled(options.visionModelId)) {
    return options.visionModelId;
  }

  return options.textModelId;
}
