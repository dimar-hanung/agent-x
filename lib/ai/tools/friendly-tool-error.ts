import type { NativeToolKey } from "@/lib/ai/tools/tool-keys";

/** Short Indonesian noun for the tool domain (user-facing). */
const TOOL_FRIENDLY_NOUNS = {
  get_time: "waktu",
  exa_web_search: "pencarian web",
  exa_web_fetch: "pembacaan halaman",
  create_schedule: "otomatisasi",
  list_schedules: "otomatisasi",
  cancel_schedule: "otomatisasi",
  send_email: "email",
  search_inbox: "inbox",
  read_email: "email",
  list_calendar_events: "kalender",
  create_calendar_event: "kalender",
  search_drive: "Drive",
  read_drive_file: "Drive",
  upload_drive_file: "Drive",
  list_todos: "todo",
  get_todo: "todo",
  create_todo: "todo",
  update_todo: "todo",
  delete_todo: "todo",
  remember_memory: "memory",
  forget_memory: "memory",
  list_memories: "memory",
} as const satisfies Record<NativeToolKey, string>;

function getToolFriendlyNoun(toolName: string): string {
  if (Object.hasOwn(TOOL_FRIENDLY_NOUNS, toolName)) {
    return TOOL_FRIENDLY_NOUNS[toolName as NativeToolKey];
  }
  return "aksi";
}

function getToolFailureFallback(toolName: string): string {
  return `Gagal menjalankan ${getToolFriendlyNoun(toolName)}. Coba lagi nanti.`;
}

function looksTechnical(message: string): boolean {
  return (
    /\b(EXA_API_KEY|API[_ ]?KEY|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|stack|traceback)\b/i.test(
      message
    ) ||
    /\b(Failed to|Error:|Exception|TypeError|Cannot read|undefined is not)\b/i.test(
      message
    ) ||
    /\(\d{3}\)/.test(message) ||
    /\b(401|403|404|429|500|502|503)\b/.test(message) ||
    /Settings\s*>\s*Integrations/i.test(message) ||
    /^[a-z]+_[a-z_]+$/.test(message)
  );
}

/**
 * Map raw tool error (often English / technical) to a short Indonesian user message.
 */
export function toFriendlyToolError(options: {
  toolName: string;
  message?: string | null;
  code?: string | null;
}): string {
  const code = options.code?.trim() ?? "";
  const raw = options.message?.trim() ?? "";
  const noun = getToolFriendlyNoun(options.toolName);

  if (
    code === "EXA_NOT_CONFIGURED" ||
    /EXA_NOT_CONFIGURED|EXA_API_KEY/i.test(raw)
  ) {
    return "Pencarian web belum tersedia. Hubungi admin untuk mengaktifkannya.";
  }

  if (
    /Google is not connected/i.test(raw) ||
    /Settings\s*>\s*Integrations/i.test(raw) ||
    /connect your account/i.test(raw)
  ) {
    return "Akun Google belum terhubung. Hubungkan di Pengaturan > Integrasi.";
  }

  if (/No message found/i.test(raw)) {
    return "Email tidak ditemukan.";
  }

  if (/Invalid timezone/i.test(raw)) {
    return "Zona waktu tidak valid. Gunakan zona seperti Asia/Jakarta.";
  }

  if (/Todo tidak ditemukan/i.test(raw)) {
    return "Todo tidak ditemukan.";
  }

  if (/Otomatisasi tidak ditemukan/i.test(raw)) {
    return "Otomatisasi tidak ditemukan atau sudah tidak aktif.";
  }

  if (/Isi id atau code todo/i.test(raw)) {
    return "Sebutkan id atau kode todo (mis. TODO-1).";
  }

  if (/Data tidak valid/i.test(raw)) {
    return "Data tidak valid. Periksa lagi lalu coba ulang.";
  }

  if (/Pencarian web gagal/i.test(raw)) {
    return "Pencarian web gagal. Coba lagi nanti.";
  }

  if (/Pembacaan halaman gagal/i.test(raw)) {
    return "Gagal membaca halaman. Coba lagi nanti.";
  }

  if (/Failed to list Google Calendar|Failed to create.*[Cc]alendar/i.test(raw)) {
    return `Gagal mengakses ${noun}. Coba lagi nanti.`;
  }

  if (/Failed to (search|send|read|upload|list)/i.test(raw)) {
    return `Gagal mengakses ${noun}. Coba lagi nanti.`;
  }

  if (!raw) {
    return getToolFailureFallback(options.toolName);
  }

  if (looksTechnical(raw)) {
    return getToolFailureFallback(options.toolName);
  }

  // Already user-facing Indonesian (or plain text) — keep as-is.
  return raw;
}

export function formatWhatsAppToolError(options: {
  toolName: string;
  message?: string | null;
  code?: string | null;
}): string {
  return `❌ ${toFriendlyToolError(options)}`;
}
