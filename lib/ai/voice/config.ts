import {
  isVoiceInputModelEnabled,
  isVoiceReplyModelEnabled,
} from "@/lib/admin/model-settings/constants";
import type { ModelSettingsView } from "@/lib/admin/model-settings/schemas";

export interface VoiceConfig {
  apiKey: string;
  inputEnabled: boolean;
  replyEnabled: boolean;
  sttModel: string;
  ttsModel: string;
  ttsVoice: string;
  replyProbability: number;
  replyMaxChars: number;
  replyMaxWords: number;
  inputMaxSeconds: number;
  inputMaxBytes: number;
}

export function getVoiceConfig(
  settings: ModelSettingsView
): VoiceConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() ?? "",
    inputEnabled: isVoiceInputModelEnabled(settings.voiceInputModelId),
    replyEnabled: isVoiceReplyModelEnabled(settings.voiceReplyModelId),
    sttModel: settings.voiceInputModelId,
    ttsModel: settings.voiceReplyModelId,
    ttsVoice: settings.voiceReplyVoice,
    replyProbability: settings.voiceReplyPercent / 100,
    replyMaxChars: settings.voiceReplyMaxChars,
    replyMaxWords: settings.voiceReplyMaxWords,
    inputMaxSeconds: settings.voiceInputMaxSeconds,
    inputMaxBytes: settings.voiceInputMaxBytes,
  };
}
