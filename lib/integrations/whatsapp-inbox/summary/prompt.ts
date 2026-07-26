export interface WhatsAppSummaryHighlights {
  hal_penting: string[];
  tindakan: string[];
  keputusan: string[];
  pertanyaan_terbuka: string[];
}

export function buildExecutiveSummaryPrompt(
  chatName: string,
  chatType: "dm" | "group",
  transcript: string,
  maxTokens: number
): string {
  return `Buat ringkasan eksekutif WhatsApp dalam Bahasa Indonesia untuk chat "${chatName}" (${chatType === "group" ? "grup" : "percakapan pribadi"}).

Fokus pada hal yang penting bagi orang sibuk: apa yang terjadi, siapa terlibat, apa yang perlu ditindaklanjuti.
Jangan ulangi setiap pesan kecil-talk; gabungkan topik serupa.

Gunakan format berikut:

## Ringkasan
[2-4 kalimat ringkas]

## Hal penting
- ...

## Tindakan
- ...

## Keputusan
- ...

## Pertanyaan terbuka
- ...

Jika sebuah bagian kosong, tulis "- (tidak ada)".

Batasi output di bawah ${maxTokens} token.

TRANSCRIPT:
${transcript}`;
}

export function buildMultiChatChunkPrompt(
  chats: Array<{
    chatName: string;
    chatType: "dm" | "group";
    transcript: string;
  }>,
  options: {
    chunkIndex: number;
    chunkCount: number;
    maxTokens: number;
  }
): string {
  const body = chats
    .map(
      (item) =>
        `### ${item.chatName} (${item.chatType === "group" ? "grup" : "DM"})\n${item.transcript}`
    )
    .join("\n\n");

  const chunkLabel =
    options.chunkCount > 1
      ? ` (bagian ${options.chunkIndex} dari ${options.chunkCount})`
      : "";

  return `Buat ringkasan eksekutif WhatsApp dalam Bahasa Indonesia untuk ${chats.length} chat berikut${chunkLabel}.

Fokus pada hal penting bagi orang sibuk: apa yang terjadi, siapa terlibat, apa yang perlu ditindaklanjuti.
Susun per chat, urutkan dari yang paling perlu perhatian.
Jangan ulangi small-talk; gabungkan topik serupa.

Gunakan format ringkas per chat:
### [Nama chat]
- Ringkasan singkat
- Tindakan (jika ada)

Batasi output di bawah ${options.maxTokens} token.

TRANSCRIPT CHAT:
${body}`;
}

export function buildDigestPrompt(
  chatSummaries: Array<{ chatName: string; chatType: "dm" | "group"; summary: string }>,
  maxTokens: number
): string {
  const body = chatSummaries
    .map(
      (item) =>
        `### ${item.chatName} (${item.chatType === "group" ? "grup" : "DM"})\n${item.summary}`
    )
    .join("\n\n");

  return `Buat ringkasan eksekutif gabungan WhatsApp dalam Bahasa Indonesia untuk beberapa chat berikut.

Susun per chat, urutkan dari yang paling perlu perhatian.
Gunakan Bahasa Indonesia yang ringkas dan actionable.

Batasi output di bawah ${maxTokens} token.

CHAT SUMMARIES:
${body}`;
}

export function parseHighlightsFromSummary(summaryText: string): WhatsAppSummaryHighlights {
  const sections: WhatsAppSummaryHighlights = {
    hal_penting: [],
    tindakan: [],
    keputusan: [],
    pertanyaan_terbuka: [],
  };

  const lines = summaryText.split("\n");
  let current: keyof WhatsAppSummaryHighlights | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (lower.startsWith("## hal penting")) {
      current = "hal_penting";
      continue;
    }
    if (lower.startsWith("## tindakan")) {
      current = "tindakan";
      continue;
    }
    if (lower.startsWith("## keputusan")) {
      current = "keputusan";
      continue;
    }
    if (lower.startsWith("## pertanyaan terbuka")) {
      current = "pertanyaan_terbuka";
      continue;
    }
    if (lower.startsWith("## ringkasan")) {
      current = null;
      continue;
    }

    if (current && trimmed.startsWith("-")) {
      const item = trimmed.replace(/^-\s*/, "").trim();
      if (item && item !== "(tidak ada)") {
        sections[current].push(item);
      }
    }
  }

  return sections;
}
