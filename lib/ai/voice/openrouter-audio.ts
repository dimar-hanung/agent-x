import type { VoiceConfig } from "./config";

const OPENROUTER_AUDIO_BASE_URL = "https://openrouter.ai/api/v1/audio";
const AUDIO_REQUEST_TIMEOUT_MS = 45_000;

interface OpenRouterErrorBody {
  error?: {
    message?: string;
  };
  message?: string;
}

interface OpenRouterTranscriptionBody {
  text?: string;
}

function resolveAudioFormat(mimeType: string, fileName?: string): string {
  const mime = mimeType.toLowerCase();
  const extension = fileName?.split(".").pop()?.toLowerCase();

  if (mime.includes("ogg") || extension === "ogg" || extension === "oga") {
    return "ogg";
  }

  if (mime.includes("mpeg") || extension === "mp3") {
    return "mp3";
  }

  if (
    mime.includes("mp4") ||
    extension === "m4a" ||
    extension === "mp4"
  ) {
    return "m4a";
  }

  if (mime.includes("wav") || extension === "wav") {
    return "wav";
  }

  if (mime.includes("flac") || extension === "flac") {
    return "flac";
  }

  if (mime.includes("aac") || extension === "aac") {
    return "aac";
  }

  throw new Error("Format pesan suara tidak didukung.");
}

async function readOpenRouterError(response: Response): Promise<string> {
  const fallback =
    "OpenRouter audio request gagal (" + response.status + ").";

  try {
    const body = (await response.json()) as OpenRouterErrorBody;
    return body.error?.message || body.message || fallback;
  } catch {
    return fallback;
  }
}

function requireApiKey(config: VoiceConfig): string {
  if (!config.apiKey) {
    throw new Error("OpenRouter API key belum dikonfigurasi.");
  }

  return config.apiKey;
}

function withTimeout(abortSignal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(AUDIO_REQUEST_TIMEOUT_MS);
  return abortSignal
    ? AbortSignal.any([abortSignal, timeout])
    : timeout;
}

export async function transcribeAudio(
  input: {
    base64: string;
    mimeType: string;
    fileName?: string;
    byteLength: number;
    abortSignal?: AbortSignal;
  },
  config: VoiceConfig
): Promise<string> {
  if (!config.inputEnabled || !config.sttModel) {
    throw new Error("Fitur pesan suara belum diaktifkan.");
  }

  if (input.byteLength > config.inputMaxBytes) {
    throw new Error("Pesan suara terlalu besar untuk diproses.");
  }

  const response = await fetch(
    OPENROUTER_AUDIO_BASE_URL + "/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + requireApiKey(config),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.sttModel,
        input_audio: {
          data: input.base64,
          format: resolveAudioFormat(input.mimeType, input.fileName),
        },
      }),
      signal: withTimeout(input.abortSignal),
    }
  );

  if (!response.ok) {
    throw new Error(await readOpenRouterError(response));
  }

  const body = (await response.json()) as OpenRouterTranscriptionBody;
  const text = body.text?.trim();

  if (!text) {
    throw new Error("Transkripsi pesan suara kosong.");
  }

  return text;
}

export async function synthesizeSpeech(
  text: string,
  config: VoiceConfig,
  abortSignal?: AbortSignal
): Promise<{ base64: string; mimeType: string }> {
  if (!config.replyEnabled || !config.ttsModel || !config.ttsVoice) {
    throw new Error("Balasan voice belum diaktifkan.");
  }

  const response = await fetch(OPENROUTER_AUDIO_BASE_URL + "/speech", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + requireApiKey(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ttsModel,
      input: text,
      voice: config.ttsVoice,
      response_format: "mp3",
    }),
    signal: withTimeout(abortSignal),
  });

  if (!response.ok) {
    throw new Error(await readOpenRouterError(response));
  }

  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "";

  if (!mimeType.startsWith("audio/")) {
    throw new Error("OpenRouter TTS tidak mengembalikan audio.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length === 0) {
    throw new Error("Audio balasan kosong.");
  }

  return {
    base64: bytes.toString("base64"),
    mimeType,
  };
}
