import {
  AI_READ_TEXT_MAX_CHARS,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { ensureFolderPath } from "@/lib/files/ensure-folder-path";
import { uploadFileBytes } from "@/lib/files/repository";
import { isSeaweedfsConfigured } from "@/lib/files/s3-client";
import type {
  WhatsAppDownloadedMedia,
  WhatsAppInboundAttachmentMeta,
  WhatsAppInboundMessage,
  WhatsAppSavedAttachment,
} from "@/lib/integrations/whatsapp/types";

export const WA_VISION_DISABLED_REPLY =
  "Pemrosesan gambar/file belum diaktifkan. Minta admin mengaktifkan Vision Model di Pengaturan Model.";

export const WA_MEDIA_DOWNLOAD_FAILED_REPLY =
  "Gagal memproses lampiran. Coba kirim ulang.";

export const WA_STORAGE_NOT_CONFIGURED_REPLY =
  "Penyimpanan file belum dikonfigurasi. Lampiran tidak dapat disimpan.";

function sanitizeFolderSegment(value: string): string {
  const sanitized = value
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return sanitized || "kontak";
}

function buildWaFolderSegments(inbound: WhatsAppInboundMessage): string[] {
  if (inbound.isGroup && inbound.groupFolderSlug) {
    return ["wa", inbound.groupFolderSlug];
  }

  const phoneDigits = inbound.senderPhoneE164.replace(/\D/g, "");
  return ["wa", sanitizeFolderSegment(phoneDigits)];
}

export function isReadableTextFile(mimeType: string, fileName: string): boolean {
  const mime = mimeType.toLowerCase();

  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    mime.endsWith("+json") ||
    mime.endsWith("+xml")
  ) {
    return true;
  }

  return /\.(txt|md|markdown|csv|json|xml|html|htm|js|ts|tsx|jsx|css|yml|yaml|log)$/i.test(
    fileName
  );
}

export function attachmentRequiresVision(
  attachment: Pick<WhatsAppInboundAttachmentMeta, "mediaType" | "mimeType" | "fileName">
): boolean {
  if (attachment.mediaType === "image" || attachment.mediaType === "video") {
    return true;
  }

  const mime = attachment.mimeType.toLowerCase();
  if (mime.startsWith("image/") || mime.startsWith("video/")) {
    return true;
  }

  if (mime === "application/pdf") {
    return true;
  }

  return false;
}

function buildStoredFileName(fileName: string, messageId?: string): string {
  const safeName = fileName.replace(/[/\\]/g, "_").trim() || "file";
  const prefix = messageId?.slice(0, 8) ?? Date.now().toString(36);
  return `${prefix}-${safeName}`;
}

function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

export async function saveInboundWhatsAppAttachments(
  userId: string,
  inbound: WhatsAppInboundMessage,
  downloaded: Array<{
    meta: WhatsAppInboundAttachmentMeta;
    media: WhatsAppDownloadedMedia;
  }>
): Promise<WhatsAppSavedAttachment[]> {
  if (!isSeaweedfsConfigured()) {
    throw new Error(SEAWEEDFS_NOT_CONFIGURED_MESSAGE);
  }

  const parentId = await ensureFolderPath(userId, buildWaFolderSegments(inbound));
  const saved: WhatsAppSavedAttachment[] = [];

  for (const item of downloaded) {
    const storedName = buildStoredFileName(
      item.meta.fileName,
      item.meta.messageKey.id
    );
    const requiresVision = attachmentRequiresVision(item.meta);
    const readableText = isReadableTextFile(item.meta.mimeType, item.meta.fileName);

    const file = await uploadFileBytes(userId, {
      name: storedName,
      parentId,
      mimeType: item.media.mimeType || item.meta.mimeType,
      body: item.media.buffer,
    });

    let textContent: string | undefined;
    if (readableText) {
      let content = item.media.buffer.toString("utf8");
      if (content.length > AI_READ_TEXT_MAX_CHARS) {
        content = content.slice(0, AI_READ_TEXT_MAX_CHARS);
      }
      textContent = content;
    }

    saved.push({
      fileId: file.id,
      fileName: file.name,
      mimeType: item.media.mimeType || item.meta.mimeType,
      mediaType: item.meta.mediaType,
      requiresVision,
      textContent,
      dataUrl: requiresVision
        ? toDataUrl(item.media.mimeType || item.meta.mimeType, item.media.base64)
        : undefined,
    });
  }

  return saved;
}

export function inboundHasVisionOnlyAttachments(
  attachments: WhatsAppSavedAttachment[],
  text: string
): boolean {
  if (attachments.length === 0) {
    return false;
  }

  const hasReadableText = attachments.some((item) => item.textContent);
  if (text.trim() || hasReadableText) {
    return attachments.some((item) => item.requiresVision);
  }

  return attachments.every((item) => item.requiresVision);
}

export function inboundRequiresVisionModel(
  attachments: WhatsAppSavedAttachment[]
): boolean {
  return attachments.some((item) => item.requiresVision);
}
