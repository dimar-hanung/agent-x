import {
  ExaApiError,
  ExaNotConfiguredError,
  searchExa,
} from "@/lib/ai/exa/client";

import type { ExaWebSearchInput } from "./schema";
import type { ExaWebSearchToolResult } from "./types";

export async function executeExaWebSearch(
  input: ExaWebSearchInput
): Promise<ExaWebSearchToolResult> {
  try {
    const data = await searchExa({
      query: input.query,
      numResults: input.numResults,
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
          "Pencarian web tidak tersedia. EXA_API_KEY belum dikonfigurasi di server.",
      };
    }

    if (error instanceof ExaApiError) {
      return {
        success: false,
        message: `Pencarian web gagal (${error.status}): ${error.message}`,
      };
    }

    return {
      success: false,
      message: "Pencarian web gagal karena kesalahan tidak terduga.",
    };
  }
}
