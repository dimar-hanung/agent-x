import { z } from "zod";

import { TEXT_MODEL_IDS, VISION_MODEL_IDS } from "./constants";

export const updateModelSettingsSchema = z.object({
  textModelId: z.enum(TEXT_MODEL_IDS as [string, ...string[]]),
  visionModelId: z.enum(VISION_MODEL_IDS as [string, ...string[]]),
});

export type UpdateModelSettingsInput = z.infer<typeof updateModelSettingsSchema>;

export interface ModelSettingsView {
  textModelId: string;
  visionModelId: string;
  updatedAt: string;
}

export interface ModelSettingsOptionsView {
  textModels: Array<{ id: string; label: string }>;
  visionModels: Array<{ id: string; label: string }>;
}
