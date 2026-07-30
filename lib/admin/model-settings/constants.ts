export const TEXT_MODEL_OPTIONS = [
  {
    id: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
  },
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
  },
  {
    id: "qwen/qwen3-8b",
    label: "Qwen3 8B",
  },
] as const;

export const VISION_MODEL_OPTIONS = [
  {
    id: "disabled",
    label: "Disabled",
  },
  {
    id: "qwen/qwen3.7-flash",
    label: "Qwen3.7 Flash",
  },
  {
    id: "google/gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
  },
  {
    id: "qwen/qwen3-vl-8b-instruct",
    label: "Qwen3 VL 8B Instruct",
  },
] as const;

export type TextModelId = (typeof TEXT_MODEL_OPTIONS)[number]["id"];
export type VisionModelId = (typeof VISION_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_TEXT_MODEL_ID: TextModelId = "deepseek/deepseek-v4-pro";

export const TEXT_MODEL_IDS = TEXT_MODEL_OPTIONS.map((option) => option.id);
export const VISION_MODEL_IDS = VISION_MODEL_OPTIONS.map((option) => option.id);

export function isTextModelId(value: string): value is TextModelId {
  return TEXT_MODEL_IDS.includes(value as TextModelId);
}

export function isVisionModelId(value: string): value is VisionModelId {
  return VISION_MODEL_IDS.includes(value as VisionModelId);
}

export function isVisionModelEnabled(visionModelId: string): boolean {
  return visionModelId !== "disabled";
}
