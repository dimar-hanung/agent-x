import type { NativeToolKey } from "@/lib/ai/tools/tool-keys";

/** Short Indonesian progress lines sent to WhatsApp when a tool starts. */
const TOOL_PROGRESS_LABELS = {
  get_time: "Memeriksa waktu…",
  exa_web_search: "Mencari di web…",
  exa_web_fetch: "Membaca halaman…",
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
} as const satisfies Record<NativeToolKey, string>;

export function getToolProgressLabel(toolName: string): string {
  if (Object.hasOwn(TOOL_PROGRESS_LABELS, toolName)) {
    return TOOL_PROGRESS_LABELS[toolName as NativeToolKey];
  }

  return `Menjalankan ${toolName}…`;
}
