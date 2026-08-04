import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

import {
  DEFAULT_TEXT_MODEL_ID,
  DEFAULT_VOICE_INPUT_MAX_BYTES,
  DEFAULT_VOICE_INPUT_MAX_SECONDS,
  DEFAULT_VOICE_INPUT_MODEL_ID,
  DEFAULT_VOICE_REPLY_MAX_CHARS,
  DEFAULT_VOICE_REPLY_MAX_WORDS,
  DEFAULT_VOICE_REPLY_MODEL_ID,
  DEFAULT_VOICE_REPLY_PERCENT,
  DEFAULT_VOICE_REPLY_VOICE,
  DEFAULT_WEB_SEARCH_PROVIDER_ID,
  TEXT_MODEL_OPTIONS,
  VISION_MODEL_OPTIONS,
  VOICE_INPUT_MODEL_OPTIONS,
  VOICE_REPLY_MODEL_OPTIONS,
  WEB_SEARCH_PROVIDER_OPTIONS,
  isTextModelId,
  isVisionModelId,
  isVoiceInputModelId,
  isVoiceReplyModelId,
  isWebSearchProviderId,
} from "./constants";
import type {
  ModelSettingsOptionsView,
  ModelSettingsView,
  UpdateModelSettingsInput,
} from "./schemas";

const SINGLETON_SETTINGS_ID = "00000000-0000-4000-8000-000000000002";

function getBootstrapTextModelId(): string {
  const fromEnv = process.env.OPENROUTER_MODEL?.trim();
  if (fromEnv && isTextModelId(fromEnv)) {
    return fromEnv;
  }
  return DEFAULT_TEXT_MODEL_ID;
}

function toView(row: typeof appSettings.$inferSelect): ModelSettingsView {
  return {
    textModelId: row.textModelId,
    visionModelId: row.visionModelId,
    voiceInputModelId: row.voiceInputModelId,
    voiceReplyModelId: row.voiceReplyModelId,
    voiceReplyVoice: row.voiceReplyVoice,
    voiceReplyPercent: row.voiceReplyPercent,
    voiceInputMaxSeconds: row.voiceInputMaxSeconds,
    voiceInputMaxBytes: row.voiceInputMaxBytes,
    voiceReplyMaxChars: row.voiceReplyMaxChars,
    voiceReplyMaxWords: row.voiceReplyMaxWords,
    webSearchProvider: row.webSearchProvider,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getOrCreateSettingsRow() {
  const [existing] = await db.select().from(appSettings).limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(appSettings)
    .values({
      id: SINGLETON_SETTINGS_ID,
      textModelId: getBootstrapTextModelId(),
      visionModelId: "disabled",
      voiceInputModelId: DEFAULT_VOICE_INPUT_MODEL_ID,
      voiceReplyModelId: DEFAULT_VOICE_REPLY_MODEL_ID,
      voiceReplyVoice: DEFAULT_VOICE_REPLY_VOICE,
      voiceReplyPercent: DEFAULT_VOICE_REPLY_PERCENT,
      voiceInputMaxSeconds: DEFAULT_VOICE_INPUT_MAX_SECONDS,
      voiceInputMaxBytes: DEFAULT_VOICE_INPUT_MAX_BYTES,
      voiceReplyMaxChars: DEFAULT_VOICE_REPLY_MAX_CHARS,
      voiceReplyMaxWords: DEFAULT_VOICE_REPLY_MAX_WORDS,
      webSearchProvider: DEFAULT_WEB_SEARCH_PROVIDER_ID,
    })
    .returning();

  return created;
}

export function getModelSettingsOptions(): ModelSettingsOptionsView {
  return {
    textModels: TEXT_MODEL_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    visionModels: VISION_MODEL_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    voiceInputModels: VOICE_INPUT_MODEL_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    voiceReplyModels: VOICE_REPLY_MODEL_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    webSearchProviders: WEB_SEARCH_PROVIDER_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })),
  };
}

export async function getModelSettings(): Promise<ModelSettingsView> {
  const row = await getOrCreateSettingsRow();
  return toView(row);
}

export async function updateModelSettings(
  input: UpdateModelSettingsInput
): Promise<ModelSettingsView> {
  if (!isTextModelId(input.textModelId)) {
    throw new Error("Model teks tidak valid.");
  }

  if (!isVisionModelId(input.visionModelId)) {
    throw new Error("Model vision tidak valid.");
  }

  if (!isVoiceInputModelId(input.voiceInputModelId)) {
    throw new Error("Model input voice tidak valid.");
  }

  if (!isVoiceReplyModelId(input.voiceReplyModelId)) {
    throw new Error("Model balasan voice tidak valid.");
  }

  if (!isWebSearchProviderId(input.webSearchProvider)) {
    throw new Error("Penyedia pencarian web tidak valid.");
  }

  const row = await getOrCreateSettingsRow();

  const [updated] = await db
    .update(appSettings)
    .set({
      textModelId: input.textModelId,
      visionModelId: input.visionModelId,
      voiceInputModelId: input.voiceInputModelId,
      voiceReplyModelId: input.voiceReplyModelId,
      voiceReplyVoice: input.voiceReplyVoice,
      voiceReplyPercent: input.voiceReplyPercent,
      voiceInputMaxSeconds: input.voiceInputMaxSeconds,
      voiceInputMaxBytes: input.voiceInputMaxBytes,
      voiceReplyMaxChars: input.voiceReplyMaxChars,
      voiceReplyMaxWords: input.voiceReplyMaxWords,
      webSearchProvider: input.webSearchProvider,
      updatedAt: new Date(),
    })
    .where(eq(appSettings.id, row.id))
    .returning();

  return toView(updated);
}
