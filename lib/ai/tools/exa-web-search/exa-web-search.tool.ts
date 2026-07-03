import { tool } from "ai";
import { z } from "zod";

import {
  ExaApiError,
  ExaNotConfiguredError,
  searchExa,
} from "@/lib/ai/exa/client";

import type { ExaWebSearchToolResult } from "../ai-tools.types";

export function createExaWebSearchTool() {
  return tool({
    description:
      "Search the web for current information via Exa. Use for news, facts, documentation, and anything that may be outdated in training data.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe(
          "Natural language search query. Describe the ideal page, not just keywords."
        ),
      numResults: z
        .number()
        .optional()
        .describe("Number of search results to return (default: 10)."),
    }),
    execute: async ({ query, numResults }): Promise<ExaWebSearchToolResult> => {
      try {
        const data = await searchExa({ query, numResults });

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
    },
  });
}
