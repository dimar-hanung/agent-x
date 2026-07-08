import {
  ExaApiError,
  ExaNotConfiguredError,
  fetchExaContents,
} from "@/lib/ai/exa/client";

import type { ExaWebFetchInput } from "./schema";
import type { ExaWebFetchToolResult } from "./types";

export async function executeExaWebFetch(
  input: ExaWebFetchInput
): Promise<ExaWebFetchToolResult> {
  try {
    const data = await fetchExaContents({
      urls: input.urls,
      maxCharacters: input.maxCharacters,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof ExaNotConfiguredError) {
      return {
        success: false,
        code: "EXA_NOT_CONFIGURED",
        message:
          "Pembacaan halaman web tidak tersedia. EXA_API_KEY belum dikonfigurasi di server.",
      };
    }

    if (error instanceof ExaApiError) {
      return {
        success: false,
        message: `Pembacaan halaman gagal (${error.status}): ${error.message}`,
      };
    }

    return {
      success: false,
      message: "Pembacaan halaman gagal karena kesalahan tidak terduga.",
    };
  }
}
