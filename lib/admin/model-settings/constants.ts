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

export const VOICE_INPUT_MODEL_OPTIONS = [
  {
    id: "disabled",
    label: "Disabled",
  },
  {
    id: "openai/whisper-large-v3",
    label: "Whisper Large V3",
  },
] as const;

export const VOICE_REPLY_MODEL_OPTIONS = [
  {
    id: "disabled",
    label: "Disabled",
  },
  {
    id: "openai/gpt-4o-mini-tts-2025-12-15",
    label: "GPT-4o Mini TTS",
  },
] as const;

export type TextModelId = (typeof TEXT_MODEL_OPTIONS)[number]["id"];
export type VisionModelId = (typeof VISION_MODEL_OPTIONS)[number]["id"];
export type VoiceInputModelId =
  (typeof VOICE_INPUT_MODEL_OPTIONS)[number]["id"];
export type VoiceReplyModelId =
  (typeof VOICE_REPLY_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_TEXT_MODEL_ID: TextModelId = "deepseek/deepseek-v4-pro";
export const DEFAULT_VOICE_INPUT_MODEL_ID: VoiceInputModelId =
  "openai/whisper-large-v3";
export const DEFAULT_VOICE_REPLY_MODEL_ID: VoiceReplyModelId =
  "openai/gpt-4o-mini-tts-2025-12-15";
export const DEFAULT_VOICE_REPLY_VOICE = "nova";
export const DEFAULT_VOICE_REPLY_PERCENT = 35;
export const DEFAULT_VOICE_INPUT_MAX_SECONDS = 120;
export const DEFAULT_VOICE_INPUT_MAX_BYTES = 10 * 1024 * 1024;
export const DEFAULT_VOICE_REPLY_MAX_CHARS = 600;
export const DEFAULT_VOICE_REPLY_MAX_WORDS = 80;

export const TEXT_MODEL_IDS = TEXT_MODEL_OPTIONS.map((option) => option.id);
export const VISION_MODEL_IDS = VISION_MODEL_OPTIONS.map((option) => option.id);
export const VOICE_INPUT_MODEL_IDS = VOICE_INPUT_MODEL_OPTIONS.map(
  (option) => option.id
);
export const VOICE_REPLY_MODEL_IDS = VOICE_REPLY_MODEL_OPTIONS.map(
  (option) => option.id
);

export function isTextModelId(value: string): value is TextModelId {
  return TEXT_MODEL_IDS.includes(value as TextModelId);
}

export function isVisionModelId(value: string): value is VisionModelId {
  return VISION_MODEL_IDS.includes(value as VisionModelId);
}

export function isVoiceInputModelId(
  value: string
): value is VoiceInputModelId {
  return VOICE_INPUT_MODEL_IDS.includes(value as VoiceInputModelId);
}

export function isVoiceReplyModelId(
  value: string
): value is VoiceReplyModelId {
  return VOICE_REPLY_MODEL_IDS.includes(value as VoiceReplyModelId);
}

export function isVisionModelEnabled(visionModelId: string): boolean {
  return visionModelId !== "disabled";
}

export function isVoiceInputModelEnabled(modelId: string): boolean {
  return modelId !== "disabled";
}

export function isVoiceReplyModelEnabled(modelId: string): boolean {
  return modelId !== "disabled";
}
