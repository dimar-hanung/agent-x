import { randomInt } from "node:crypto";

import type { VoiceConfig } from "./config";

const NEWS_PATTERN =
  /\b(berita|news|breaking|headline|terkini|terbaru|kabar hari ini|update hari ini|current event|trending)\b/i;
const EXPLICIT_TEXT_PATTERN =
  /\b(balas|jawab|kirim|berikan)\s+(dengan\s+)?(teks|tulisan|tertulis)\b/i;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/i;
const RICH_TEXT_PATTERN =
  /(?:^|\n)\s*(?:#{1,6}\s+|\x60{3}|\|.+\|)/m;
const LIST_ITEM_PATTERN =
  /(?:^|\n)\s*(?:[-*+]\s+|\d+[.)]\s+)/gm;
const ERROR_OR_RISK_PATTERN =
  /\b(gagal|error|peringatan|darurat|bahaya|dosis|diagnosis|hukum|legal|kode otp|kata sandi|password|tidak dapat|tidak bisa)\b/i;
const EXACT_VALUE_PATTERN =
  /(?:\b(?:Rp|IDR|USD)\s?[\d.,]+|\b\d{1,2}[:.]\d{2}\b|\b[A-F0-9]{8,}\b)/i;
const TEXT_ONLY_TOOL_NAMES = new Set([
  "web_search",
  "web_fetch",
  // Preserve behavior for historical tool calls stored in chat messages.
  "exa_web_search",
  "exa_web_fetch",
  "fetch_tiktok_data",
  "fetch_twitter_data",
  "fetch_threads_data",
]);
const STATE_CHANGING_TOOL_PREFIXES = [
  "create_",
  "update_",
  "delete_",
  "cancel_",
  "send_",
  "upload_",
  "remember_",
  "forget_",
];

export type WhatsAppReplyMode = "text" | "voice";

export type VoiceReplyDecisionReason =
  | "not_voice_input"
  | "voice_disabled"
  | "explicit_text"
  | "empty"
  | "too_long"
  | "news"
  | "rich_text"
  | "url"
  | "error_or_risk"
  | "exact_value"
  | "text_only_tool"
  | "action_result"
  | "random_text"
  | "random_voice";

export interface VoiceReplyDecision {
  mode: WhatsAppReplyMode;
  reason: VoiceReplyDecisionReason;
}

export interface DecideVoiceReplyInput {
  inputWasVoice: boolean;
  userText: string;
  assistantText: string;
  toolNames?: string[];
  random?: () => number;
}

function secureRandom(): number {
  return randomInt(0, 10_000) / 10_000;
}

export function decideWhatsAppVoiceReply(
  input: DecideVoiceReplyInput,
  config: VoiceConfig
): VoiceReplyDecision {
  if (!input.inputWasVoice) {
    return { mode: "text", reason: "not_voice_input" };
  }

  if (
    !config.replyEnabled ||
    !config.apiKey ||
    !config.ttsModel ||
    !config.ttsVoice
  ) {
    return { mode: "text", reason: "voice_disabled" };
  }

  if (EXPLICIT_TEXT_PATTERN.test(input.userText)) {
    return { mode: "text", reason: "explicit_text" };
  }

  const assistantText = input.assistantText.trim();
  if (!assistantText) {
    return { mode: "text", reason: "empty" };
  }

  const wordCount = assistantText.split(/\s+/).filter(Boolean).length;
  if (
    assistantText.length > config.replyMaxChars ||
    wordCount > config.replyMaxWords
  ) {
    return { mode: "text", reason: "too_long" };
  }

  if (
    NEWS_PATTERN.test(input.userText) ||
    NEWS_PATTERN.test(assistantText)
  ) {
    return { mode: "text", reason: "news" };
  }

  if (
    input.toolNames?.some((toolName) =>
      TEXT_ONLY_TOOL_NAMES.has(toolName)
    )
  ) {
    return { mode: "text", reason: "text_only_tool" };
  }

  if (
    input.toolNames?.some((toolName) =>
      STATE_CHANGING_TOOL_PREFIXES.some((prefix) =>
        toolName.startsWith(prefix)
      )
    )
  ) {
    return { mode: "text", reason: "action_result" };
  }

  if (URL_PATTERN.test(assistantText)) {
    return { mode: "text", reason: "url" };
  }

  const listItemCount = assistantText.match(LIST_ITEM_PATTERN)?.length ?? 0;
  if (
    RICH_TEXT_PATTERN.test(assistantText) ||
    listItemCount > 1 ||
    /\bSumber\s*:/i.test(assistantText)
  ) {
    return { mode: "text", reason: "rich_text" };
  }

  if (ERROR_OR_RISK_PATTERN.test(assistantText)) {
    return { mode: "text", reason: "error_or_risk" };
  }

  if (EXACT_VALUE_PATTERN.test(assistantText)) {
    return { mode: "text", reason: "exact_value" };
  }

  const random = input.random ?? secureRandom;
  if (random() >= config.replyProbability) {
    return { mode: "text", reason: "random_text" };
  }

  return { mode: "voice", reason: "random_voice" };
}
