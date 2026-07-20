import { generateText } from "ai";

import { getChatModel, isOpenRouterConfigured } from "@/lib/ai/openrouter";
import type {
  ApifySocialPlatform,
  ApifySocialSnapshot,
} from "@/lib/db/schema";

import {
  buildPreviewItems,
  formatPreviewBullet,
  getSnapshotItems,
  platformLabel,
} from "./preview";

const MAX_ANALYSIS_ITEMS = 50;
const MAX_TEXT_LENGTH = 600;

function truncateText(text: string, limit = MAX_TEXT_LENGTH): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 3)}...` : trimmed;
}

function formatMetrics(metrics: Record<string, number> | undefined): string {
  if (!metrics || Object.keys(metrics).length === 0) {
    return "";
  }

  return Object.entries(metrics)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function buildFallbackText(snapshot: ApifySocialSnapshot): string {
  const platform = platformLabel(snapshot.platform as ApifySocialPlatform);
  const preview = buildPreviewItems(
    snapshot.platform as ApifySocialPlatform,
    getSnapshotItems(snapshot),
    8
  );
  const previewText =
    preview.length > 0
      ? `\n\nSinyal awal:\n${preview.map(formatPreviewBullet).join("\n")}`
      : "";

  if (preview.length === 0) {
    return [
      `Belum menemukan percakapan ${platform} yang sesuai dengan pencarian ini.`,
      "Coba perluas rentang tanggal, gunakan istilah yang lebih umum, atau hapus filter bahasa yang terlalu ketat.",
    ].join("\n\n");
  }

  return [
    `Analisis ${platform} sudah siap.`,
    "",
    "Berikut sinyal awal dari data yang berhasil dikumpulkan.",
    previewText.trimStart(),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAnalysisPrompt(snapshot: ApifySocialSnapshot): string | null {
  const platform = platformLabel(snapshot.platform as ApifySocialPlatform);
  const items = buildPreviewItems(
    snapshot.platform as ApifySocialPlatform,
    getSnapshotItems(snapshot),
    MAX_ANALYSIS_ITEMS
  ).filter((item) => item.text || item.title || item.url);

  if (items.length === 0) {
    return null;
  }

  const serializedItems = items
    .map((item, index) => {
      const parts = [
        `${index + 1}.`,
        item.author ? `author=${item.author}` : null,
        item.createdAt ? `date=${item.createdAt}` : null,
        item.url ? `url=${item.url}` : null,
        item.metrics ? `metrics=${formatMetrics(item.metrics)}` : null,
        `text=${truncateText(item.text ?? item.title ?? "")}`,
      ];

      return parts.filter(Boolean).join(" | ");
    })
    .join("\n");

  return `Anda adalah analis social listening yang menulis seperti briefing eksekutif yang hidup, informatif, dan mudah dibaca. Buat analisis Bahasa Indonesia dari data ${platform} berikut.

Konteks:
- Platform: ${platform}
- Input pencarian normalisasi: ${JSON.stringify(snapshot.normalizedInput)}

Data item terbatas untuk analisis:
${serializedItems}

Instruksi output:
- Jangan tampilkan tabel.
- Jangan hanya menulis bahwa data selesai diproses; berikan insight yang berguna.
- Buat gaya seperti ringkasan social media monitoring: jelas, colourful, tetapi tetap faktual.
- Gunakan emoji heading secukupnya agar output lebih hidup, tetapi tetap profesional.
- Parafrase postingan; jangan kutip panjang.
- Jika ada banyak noise atau hasil tidak relevan, jangan jadikan itu seluruh jawaban. Beri bagian kualitas data singkat, lalu jelaskan apa yang masih bisa disimpulkan.
- Jika query berisi beberapa topik, kelompokkan insight per topik bila datanya memungkinkan.
- Untuk query pendek/ambigu seperti BEI, bedakan konteks Indonesia bila terlihat dari kata terkait seperti IHSG, OJK, saham, bursa, emiten, atau rupiah. Jangan salah menganggap semua kemunculan kata sebagai relevan.
- Sertakan URL sumber penting sebagai teks polos jika tersedia.
- Jangan tampilkan snapshot ID, job ID, run ID, actor ID, atau jumlah item mentah di output user-facing.

Format jawaban:
\u{1F4CC} Analisis ${platform}: [judul ringkas tentang topik]

\u{1F4CA} Sentimen umum
- [positif/netral/negatif/campuran] dan alasan singkat.
- Jumlah item pada masing-masing kategori sentimen (positif, netral, negatif). Jika tidak ada data sentimen, tulis "Tidak ada data sentimen yang tersedia."

\u{1F4CA} Berikan list postingan/tanggapan (beserta urlnya) dengan impression/engagement tertinggi (sebanyak 3) beserta sentimennya. Engagement = like + retweet/repost/quote + comment/reply.

\u{1F525} Topik hangat
- 3-5 poin tentang isu yang paling menonjol.

\u{1F4AC} Apa yang sedang dibicarakan
- 3-5 insight naratif, bukan daftar mentah.

\u{1F9ED} Tema utama
- 3-5 tema dengan konteks singkat.

\u{26A0}\u{FE0F} Catatan kualitas data
- Jelaskan noise, bias sampel, atau keterbatasan jika ada. Jika datanya bersih, tulis singkat bahwa sinyal cukup relevan.

\u{1F517} Sumber
- URL sumber penting, satu per baris.`;
}

export async function generateApifySnapshotAnalysis(
  snapshot: ApifySocialSnapshot
): Promise<string> {
  const prompt = buildAnalysisPrompt(snapshot);

  if (!prompt || !isOpenRouterConfigured()) {
    return buildFallbackText(snapshot);
  }

  try {
    const { text } = await generateText({
      model: getChatModel(),
      prompt,
    });

    return text.trim() || buildFallbackText(snapshot);
  } catch (error) {
    console.error("Generate analisis Apify gagal:", error);
    return buildFallbackText(snapshot);
  }
}
