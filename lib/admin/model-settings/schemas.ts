import { z } from "zod";

import {
  TEXT_MODEL_IDS,
  VISION_MODEL_IDS,
  VOICE_INPUT_MODEL_IDS,
  VOICE_REPLY_MODEL_IDS,
  WEB_SEARCH_PROVIDER_IDS,
} from "./constants";

export const updateModelSettingsSchema = z.object({
  textModelId: z.enum(TEXT_MODEL_IDS as [string, ...string[]]),
  visionModelId: z.enum(VISION_MODEL_IDS as [string, ...string[]]),
  voiceInputModelId: z.enum(
    VOICE_INPUT_MODEL_IDS as [string, ...string[]]
  ),
  voiceReplyModelId: z.enum(
    VOICE_REPLY_MODEL_IDS as [string, ...string[]]
  ),
  voiceReplyVoice: z.string().trim().min(1).max(64),
  voiceReplyPercent: z.number().int().min(0).max(100),
  voiceInputMaxSeconds: z.number().int().min(10).max(600),
  voiceInputMaxBytes: z
    .number()
    .int()
    .min(1_000_000)
    .max(50_000_000),
  voiceReplyMaxChars: z.number().int().min(80).max(4_000),
  voiceReplyMaxWords: z.number().int().min(10).max(500),
  webSearchProvider: z.enum(
    WEB_SEARCH_PROVIDER_IDS as [string, ...string[]]
  ),
});

export type UpdateModelSettingsInput = z.infer<typeof updateModelSettingsSchema>;

export interface ModelSettingsView {
  textModelId: string;
  visionModelId: string;
  voiceInputModelId: string;
  voiceReplyModelId: string;
  voiceReplyVoice: string;
  voiceReplyPercent: number;
  voiceInputMaxSeconds: number;
  voiceInputMaxBytes: number;
  voiceReplyMaxChars: number;
  voiceReplyMaxWords: number;
  webSearchProvider: string;
  updatedAt: string;
}

export interface ModelSettingsOptionsView {
  textModels: Array<{ id: string; label: string }>;
  visionModels: Array<{ id: string; label: string }>;
  voiceInputModels: Array<{ id: string; label: string }>;
  voiceReplyModels: Array<{ id: string; label: string }>;
  webSearchProviders: Array<{ id: string; label: string }>;
}
