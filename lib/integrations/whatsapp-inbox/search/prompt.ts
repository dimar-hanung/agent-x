export function buildKeywordGenerationPrompt(options: {
  query: string;
  attemptedKeywords: string[];
  chatQuery?: string;
}): string {
  const attempted =
    options.attemptedKeywords.length > 0
      ? options.attemptedKeywords.map((keyword) => `- ${keyword}`).join("\n")
      : "(belum ada)";

  const scope = options.chatQuery?.trim()
    ? `Chat yang dibatasi: "${options.chatQuery.trim()}".`
    : "Cari di semua chat (DM dan grup).";

  return `Kamu membantu mencari pesan WhatsApp dengan substring ILIKE di database teks.

Pertanyaan pengguna:
${options.query}

${scope}

Kata kunci yang sudah dicoba tanpa hasil:
${attempted}

Buat SATU kata kunci pencarian baru (1–4 kata, bisa Bahasa Indonesia atau Inggris) yang berbeda dari daftar di atas.
Prioritaskan substring yang kemungkinan besar muncul di isi pesan WhatsApp.
Jika frasa panjang gagal, coba istilah lebih pendek atau sinonim.

Balas HANYA dengan kata kunci itu, tanpa penjelasan, tanpa tanda kutip, tanpa markdown.`;
}

export function buildSearchAnalysisChunkPrompt(
  query: string,
  attemptedKeywords: string[],
  chats: Array<{
    chatName: string;
    chatType: "dm" | "group";
    messages: Array<{
      senderName: string | null;
      direction: string;
      text: string;
      sentAt: string;
      matchedKeywords: string[];
    }>;
  }>,
  options: {
    chunkIndex: number;
    chunkCount: number;
    maxTokens: number;
  }
): string {
  const body = chats
    .map((chat) => {
      const lines = chat.messages
        .map((message) => {
          const who =
            message.senderName ??
            (message.direction === "outbound" ? "Saya" : "Kontak");
          const time = new Date(message.sentAt).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
          });
          const keywords = message.matchedKeywords.join(", ");
          return `[${time}] ${who} (kata kunci: ${keywords}): ${message.text}`;
        })
        .join("\n");

      return `### ${chat.chatName} (${chat.chatType === "group" ? "grup" : "DM"})\n${lines}`;
    })
    .join("\n\n");

  const chunkLabel =
    options.chunkCount > 1
      ? ` (bagian ${options.chunkIndex} dari ${options.chunkCount})`
      : "";

  const attempted =
    attemptedKeywords.length > 0
      ? attemptedKeywords.join(", ")
      : "(tidak ada)";

  return `Analisis hasil pencarian pesan WhatsApp dalam Bahasa Indonesia${chunkLabel}.

Pertanyaan pengguna: ${query}
Kata kunci yang dicoba: ${attempted}

Ringkas temuan per chat: siapa, apa isinya, apa yang perlu ditindaklanjuti.
Jangan ulangi setiap pesan mentah; fokus pada jawaban pertanyaan pengguna.

Format ringkas per chat:
### [Nama chat]
- Ringkasan singkat
- Tindakan (jika ada)

Batasi output di bawah ${options.maxTokens} token.

PESAN YANG COCOK:
${body}`;
}
