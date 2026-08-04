import { getWhatsAppSearchMaxKeywordAttempts } from "@/lib/integrations/whatsapp-inbox/config";

import { generateNextSearchKeyword } from "./keyword-generation";
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

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (input.abortSignal?.aborted) {
      return {
        success: false,
        message: "Pencarian dibatalkan.",
        attemptedKeywords,
      };
    }

    const keyword = await generateNextSearchKeyword({
      query,
      attemptedKeywords,
      chatQuery: input.chatQuery,
      abortSignal: input.abortSignal,
    });

    if (!keyword) {
      continue;
    }

    attemptedKeywords.push(keyword);

    const searchResult = await searchWhatsAppMessages(userId, {
      keywords: [keyword],
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

    successfulKeywords.push(keyword);
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
      message: `Tidak ada pesan yang cocok setelah ${attemptedKeywords.length} percobaan. Kata kunci dicoba: ${tried}.`,
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
