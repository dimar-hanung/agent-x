import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

import {
  DEFAULT_TEXT_MODEL_ID,
  TEXT_MODEL_OPTIONS,
  VISION_MODEL_OPTIONS,
  isTextModelId,
  isVisionModelId,
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

  const row = await getOrCreateSettingsRow();

  const [updated] = await db
    .update(appSettings)
    .set({
      textModelId: input.textModelId,
      visionModelId: input.visionModelId,
      updatedAt: new Date(),
    })
    .where(eq(appSettings.id, row.id))
    .returning();

  return toView(updated);
}
