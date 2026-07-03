import { tool } from "ai";
import { z } from "zod";

import {
  ExaApiError,
  ExaNotConfiguredError,
  fetchExaContents,
} from "@/lib/ai/exa/client";

import type { ExaWebFetchToolResult } from "../ai-tools.types";

export function createExaWebFetchTool() {
  return tool({
    description:
      "Fetch full webpage content as markdown via Exa. Use when the user provides a URL or search highlights are insufficient.",
    inputSchema: z.object({
      urls: z
        .array(z.string().url())
        .min(1)
        .describe("URLs to read. Batch multiple URLs in one call."),
      maxCharacters: z
        .number()
        .min(1)
        .optional()
        .describe("Maximum characters to extract per page (default: 3000)."),
    }),
    execute: async ({ urls, maxCharacters }): Promise<ExaWebFetchToolResult> => {
      try {
        const data = await fetchExaContents({ urls, maxCharacters });

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
    },
  });
}
