import type { NativeToolKey } from "@/lib/ai/tools/tool-keys";
import { isWhatsAppSearchProgressMessage } from "@/lib/integrations/whatsapp-inbox/search/progress";

/** Short Indonesian progress lines sent to WhatsApp when a tool starts. */
const TOOL_PROGRESS_LABELS = {
  get_time: "Memeriksa waktu…",
  web_search: "Mencari di web…",
  web_fetch: "Membaca halaman…",
  fetch_tiktok_data: "Mengambil data TikTok…",
  fetch_twitter_data: "Mengambil data Twitter/X…",
  fetch_threads_data: "Mengambil data Threads…",
  create_schedule: "Membuat otomatisasi…",
  list_schedules: "Memuat otomatisasi…",
  cancel_schedule: "Membatalkan otomatisasi…",
  send_email: "Mengirim email…",
  search_inbox: "Mencari di inbox…",
  read_email: "Membaca email…",
  list_calendar_events: "Menghubungkan ke kalender…",
  create_calendar_event: "Membuat acara kalender…",
  search_drive: "Mencari di Drive…",
  read_drive_file: "Membaca file Drive…",
  upload_drive_file: "Mengunggah ke Drive…",
  send_microsoft_email: "Mengirim email Outlook…",
  search_microsoft_inbox: "Mencari di inbox Outlook…",
  read_microsoft_email: "Membaca email Outlook…",
  list_microsoft_calendar_events: "Menghubungkan ke kalender Microsoft…",
  create_microsoft_calendar_event: "Membuat acara kalender Microsoft…",
  search_onedrive: "Mencari di OneDrive…",
  read_onedrive_file: "Membaca file OneDrive…",
  upload_onedrive_file: "Mengunggah ke OneDrive…",
  list_todos: "Memuat todo…",
  get_todo: "Mengambil todo…",
  create_todo: "Membuat todo…",
  update_todo: "Memperbarui todo…",
  delete_todo: "Menghapus todo…",
  remember_memory: "Menyimpan memory…",
  forget_memory: "Menghapus memory…",
  list_memories: "Memuat memory…",
  list_files: "Memuat file…",
  upload_file: "Mengunggah file…",
  read_file: "Membaca file…",
  ask_file: "Membaca dokumen…",
  list_whatsapp_chats: "Memuat chat WhatsApp…",
  list_whatsapp_contacts: "Memuat kontak WhatsApp…",
  list_whatsapp_groups: "Memuat grup WhatsApp…",
  summarize_whatsapp_chat: "Menyinkronkan dan merangkum data WhatsApp…",
  summarize_whatsapp_digest: "Menyinkronkan dan merangkum data WhatsApp…",
  search_whatsapp_messages: "Mencari dan menganalisis pesan WhatsApp…",
} as const satisfies Record<NativeToolKey, string>;

const TOOL_PROGRESS_LABEL_SET = new Set<string>(
  Object.values(TOOL_PROGRESS_LABELS)
);

export function isToolProgressLabel(text: string): boolean {
  const trimmed = text.trim();
  return (
    TOOL_PROGRESS_LABEL_SET.has(trimmed) ||
    isWhatsAppSearchProgressMessage(trimmed)
  );
}

export function getToolProgressLabel(toolName: string): string {
  if (Object.hasOwn(TOOL_PROGRESS_LABELS, toolName)) {
    return TOOL_PROGRESS_LABELS[toolName as NativeToolKey];
  }

  return `Menjalankan ${toolName}…`;
}
