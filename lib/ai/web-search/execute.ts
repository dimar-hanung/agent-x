import { getModelSettings } from "@/lib/admin/model-settings/repository";
import {
  ExaApiError,
  ExaNotConfiguredError,
  fetchExaContents,
  searchExa,
} from "@/lib/ai/exa/client";
import {
  OllamaWebApiError,
  OllamaWebNotConfiguredError,
  fetchOllamaWebPages,
  searchOllamaWeb,
} from "@/lib/ai/ollama-web/client";
import type { ExaWebFetchInput } from "@/lib/ai/tools/exa-web-fetch/schema";
import type { ExaWebFetchToolResult } from "@/lib/ai/tools/exa-web-fetch/types";
import type { ExaWebSearchInput } from "@/lib/ai/tools/exa-web-search/schema";
import type { ExaWebSearchToolResult } from "@/lib/ai/tools/exa-web-search/types";

export async function executeWebSearch(
  input: ExaWebSearchInput
): Promise<ExaWebSearchToolResult> {
  const { webSearchProvider } = await getModelSettings();

  try {
    if (webSearchProvider === "ollama") {
      const data = await searchOllamaWeb({
        query: input.query,
        maxResults: input.numResults,
      });

      return {
        success: true,
        data,
      };
    }

    const data = await searchExa({
      query: input.query,
      numResults: input.numResults,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof OllamaWebNotConfiguredError) {
      return {
        success: false,
        code: "OLLAMA_API_KEY_NOT_CONFIGURED",
        message:
          "Pencarian web tidak tersedia. OLLAMA_API_KEY belum dikonfigurasi di server.",
      };
    }

    if (error instanceof ExaNotConfiguredError) {
      return {
        success: false,
        code: "EXA_NOT_CONFIGURED",
        message:
          "Pencarian web tidak tersedia. EXA_API_KEY belum dikonfigurasi di server.",
      };
    }

    if (error instanceof OllamaWebApiError) {
      return {
        success: false,
        message: `Pencarian web gagal (${error.status}): ${error.message}`,
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

export async function executeWebFetch(
  input: ExaWebFetchInput
): Promise<ExaWebFetchToolResult> {
  const { webSearchProvider } = await getModelSettings();

  try {
    if (webSearchProvider === "ollama") {
      const data = await fetchOllamaWebPages({
        urls: input.urls,
        maxCharacters: input.maxCharacters,
      });

      return {
        success: true,
        data,
      };
    }

    const data = await fetchExaContents({
      urls: input.urls,
      maxCharacters: input.maxCharacters,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof OllamaWebNotConfiguredError) {
      return {
        success: false,
        code: "OLLAMA_API_KEY_NOT_CONFIGURED",
        message:
          "Pembacaan halaman web tidak tersedia. OLLAMA_API_KEY belum dikonfigurasi di server.",
      };
    }

    if (error instanceof ExaNotConfiguredError) {
      return {
        success: false,
        code: "EXA_NOT_CONFIGURED",
        message:
          "Pembacaan halaman web tidak tersedia. EXA_API_KEY belum dikonfigurasi di server.",
      };
    }

    if (error instanceof OllamaWebApiError) {
      return {
        success: false,
        message: `Pembacaan halaman gagal (${error.status}): ${error.message}`,
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
