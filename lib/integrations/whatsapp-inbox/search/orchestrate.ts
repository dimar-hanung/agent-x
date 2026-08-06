import { getWhatsAppSearchMaxKeywordAttempts } from "@/lib/integrations/whatsapp-inbox/config";

import { generateNextSearchKeywords } from "./keyword-generation";
import {
  formatWhatsAppSearchAttemptMessage,
  type WhatsAppSearchProgressCallback,
} from "./progress";
import {
  dedupeSearchHits,
  searchWhatsAppMessages,
  type WhatsAppMessageSearchHit,
} from "./service";

export interface RunWhatsAppMessageSearchInput {
  query: string;
  chatQuery?: string;
  since?: Date;
  abortSignal?: AbortSignal;
  onProgress?: WhatsAppSearchProgressCallback;
}

export type RunWhatsAppMessageSearchResult =
  | {
      success: true;
      query: string;
      results: WhatsAppMessageSearchHit[];
      attemptedKeywords: string[];
      successfulKeywords: string[];
      chatFilter: string | null;
    }
  | { success: false; message: string; attemptedKeywords: string[] };

function collectSuccessfulKeywords(
  batchKeywords: string[],
  results: WhatsAppMessageSearchHit[]
): string[] {
  const matched = new Set(
    results.flatMap((hit) =>
      hit.matchedKeywords.map((keyword) => keyword.toLowerCase())
    )
  );

  return batchKeywords.filter((keyword) =>
    matched.has(keyword.toLowerCase())
  );
}

export async function runWhatsAppMessageSearch(
  userId: string,
  input: RunWhatsAppMessageSearchInput
): Promise<RunWhatsAppMessageSearchResult> {
  const query = input.query.trim();
  if (!query) {
    return {
      success: false,
      message: "Pertanyaan pencarian tidak boleh kosong.",
      attemptedKeywords: [],
    };
  }

  const maxAttempts = getWhatsAppSearchMaxKeywordAttempts();
  const attemptedKeywords: string[] = [];
  const successfulKeywords: string[] = [];
  let results: WhatsAppMessageSearchHit[] = [];
  let chatFilter: string | null = null;
  let attemptCount = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (input.abortSignal?.aborted) {
      return {
        success: false,
        message: "Pencarian dibatalkan.",
        attemptedKeywords,
      };
    }

    const keywords = await generateNextSearchKeywords({
      query,
      attemptedKeywords,
      chatQuery: input.chatQuery,
      abortSignal: input.abortSignal,
    });

    if (keywords.length === 0) {
      continue;
    }

    attemptCount += 1;
    attemptedKeywords.push(...keywords);

    const message = formatWhatsAppSearchAttemptMessage(
      keywords,
      attemptCount,
      maxAttempts
    );
    await input.onProgress?.({
      type: "attempt",
      attempt: attemptCount,
      maxAttempts,
      keywords,
      message,
    });

    const searchResult = await searchWhatsAppMessages(userId, {
      keywords,
      chatQuery: input.chatQuery,
      since: input.since,
    });

    if (!searchResult.success) {
      return {
        success: false,
        message: searchResult.message,
        attemptedKeywords,
      };
    }

    chatFilter = searchResult.chatFilter;

    if (searchResult.results.length === 0) {
      continue;
    }

    successfulKeywords.push(
      ...collectSuccessfulKeywords(keywords, searchResult.results)
    );
    results = dedupeSearchHits(results, searchResult.results);
    break;
  }

  if (results.length === 0) {
    const tried =
      attemptedKeywords.length > 0
        ? attemptedKeywords.join(", ")
        : "tidak ada kata kunci yang dihasilkan";

    return {
      success: false,
      message: `Tidak ada pesan yang cocok setelah ${attemptCount} percobaan (${attemptedKeywords.length} kata kunci). Kata kunci dicoba: ${tried}.`,
      attemptedKeywords,
    };
  }

  return {
    success: true,
    query,
    results,
    attemptedKeywords,
    successfulKeywords,
    chatFilter,
  };
}
