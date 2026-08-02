"use client";

import * as React from "react";

type VoiceInputStatus = "idle" | "recording" | "transcribing";

interface UseChatVoiceInputOptions {
  enabled: boolean;
  maxSeconds: number;
  onTranscript: (text: string) => void;
}

interface UseChatVoiceInputResult {
  status: VoiceInputStatus;
  error: string | null;
  isRecording: boolean;
  isTranscribing: boolean;
  clearError: () => void;
  toggleRecording: () => Promise<void>;
}

function pickRecorderMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Gagal membaca rekaman audio."));
        return;
      }

      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca rekaman audio."));
    };

    reader.readAsDataURL(blob);
  });
}

export function useChatVoiceInput({
  enabled,
  maxSeconds,
  onTranscript,
}: UseChatVoiceInputOptions): UseChatVoiceInputResult {
  const [status, setStatus] = React.useState<VoiceInputStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const stopTimeoutRef = React.useRef<number | null>(null);
  const mimeTypeRef = React.useRef("audio/webm");
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const clearStopTimeout = React.useCallback(() => {
    if (stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  const releaseStream = React.useCallback(() => {
    for (const track of mediaStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    mediaStreamRef.current = null;
  }, []);

  const resetRecordingState = React.useCallback(() => {
    clearStopTimeout();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    releaseStream();
  }, [clearStopTimeout, releaseStream]);

  const transcribeBlob = React.useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        throw new Error("Rekaman audio kosong.");
      }

      const base64 = await blobToBase64(blob);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64,
          mimeType: mimeTypeRef.current,
          byteLength: blob.size,
          fileName: "recording.webm",
        }),
        signal: abortController.signal,
      });

      const body = (await response.json().catch(() => null)) as {
        text?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? "Gagal mentranskripsi audio.");
      }

      const text = body?.text?.trim();

      if (!text) {
        throw new Error("Transkripsi pesan suara kosong.");
      }

      onTranscript(text);
    },
    [onTranscript]
  );

  const stopRecording = React.useCallback(async () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    clearStopTimeout();

    await new Promise<void>((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          resolve();
        },
        { once: true }
      );
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, {
      type: mimeTypeRef.current,
    });

    resetRecordingState();
    setStatus("transcribing");

    try {
      await transcribeBlob(blob);
      setError(null);
    } catch (transcribeError) {
      if (
        transcribeError instanceof DOMException &&
        transcribeError.name === "AbortError"
      ) {
        return;
      }

      setError(
        transcribeError instanceof Error
          ? transcribeError.message
          : "Gagal mentranskripsi audio."
      );
    } finally {
      abortControllerRef.current = null;
      setStatus("idle");
    }
  }, [clearStopTimeout, resetRecordingState, transcribeBlob]);

  const startRecording = React.useCallback(async () => {
    if (!enabled || status !== "idle") {
      return;
    }

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = pickRecorderMimeType();

      if (!mimeType) {
        releaseStream();
        throw new Error("Browser tidak mendukung rekaman audio.");
      }

      mimeTypeRef.current = mimeType;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.start();
      setStatus("recording");

      stopTimeoutRef.current = window.setTimeout(() => {
        void stopRecording();
      }, maxSeconds * 1000);
    } catch (startError) {
      resetRecordingState();
      setStatus("idle");

      if (
        startError instanceof DOMException &&
        (startError.name === "NotAllowedError" ||
          startError.name === "PermissionDeniedError")
      ) {
        setError("Akses mikrofon ditolak.");
        return;
      }

      setError(
        startError instanceof Error
          ? startError.message
          : "Gagal memulai rekaman."
      );
    }
  }, [
    enabled,
    maxSeconds,
    releaseStream,
    resetRecordingState,
    status,
    stopRecording,
  ]);

  const toggleRecording = React.useCallback(async () => {
    if (status === "recording") {
      await stopRecording();
      return;
    }

    if (status === "idle") {
      await startRecording();
    }
  }, [startRecording, status, stopRecording]);

  React.useEffect(() => {
    return () => {
      clearStopTimeout();
      abortControllerRef.current?.abort();
      resetRecordingState();
    };
  }, [clearStopTimeout, resetRecordingState]);

  return {
    status,
    error,
    isRecording: status === "recording",
    isTranscribing: status === "transcribing",
    clearError: () => setError(null),
    toggleRecording,
  };
}
