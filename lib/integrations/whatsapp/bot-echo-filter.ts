import { isToolProgressLabel } from "@/lib/ai/tools/tool-progress-labels";
import {
  WA_MEDIA_DOWNLOAD_FAILED_REPLY,
  WA_STORAGE_NOT_CONFIGURED_REPLY,
  WA_VISION_DISABLED_REPLY,
} from "@/lib/integrations/whatsapp/save-inbound-media";

const KNOWN_BOT_REPLIES = new Set([
  "Nomor belum terdaftar. Daftarkan nomor HP kamu di AgentX → Settings → Integrations.",
  "Terjadi kesalahan saat memproses pesan. Coba lagi nanti.",
  "Pembuatan ringkasan dibatalkan.",
  WA_VISION_DISABLED_REPLY,
  WA_MEDIA_DOWNLOAD_FAILED_REPLY,
  WA_STORAGE_NOT_CONFIGURED_REPLY,
]);

/** Ignore webhook text that AgentX itself sent (tool progress, errors, canned replies). */
export function isAgentGeneratedWhatsAppText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  if (isToolProgressLabel(trimmed)) {
    return true;
  }

  if (trimmed.startsWith("❌")) {
    return true;
  }

  return KNOWN_BOT_REPLIES.has(trimmed);
}
