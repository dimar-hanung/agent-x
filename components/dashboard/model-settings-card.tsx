"use client";

import { useRef, useState } from "react";

import {
  ModelSettingsRow,
  ModelSettingsSection,
  ModelSettingsSwitch,
} from "@/components/dashboard/model-settings-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ModelSettingsOptionsView,
  ModelSettingsView,
} from "@/lib/admin/model-settings/schemas";
import { cn } from "@/lib/utils";

interface ModelSettingsCardProps {
  initialSettings: ModelSettingsView;
  initialOptions: ModelSettingsOptionsView;
}

const BYTES_PER_MEGABYTE = 1024 * 1024;
const selectTriggerClassName = "w-[11rem]";

function toMegabytes(bytes: number): number {
  return bytes / BYTES_PER_MEGABYTE;
}

function firstEnabledOptionId(
  options: Array<{ id: string; label: string }>
): string {
  const enabled = options.find((option) => option.id !== "disabled");
  return enabled?.id ?? options[0]?.id ?? "";
}

export function ModelSettingsCard({
  initialSettings,
  initialOptions,
}: ModelSettingsCardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [textModelId, setTextModelId] = useState(initialSettings.textModelId);
  const [visionModelId, setVisionModelId] = useState(
    initialSettings.visionModelId
  );
  const [voiceInputModelId, setVoiceInputModelId] = useState(
    initialSettings.voiceInputModelId
  );
  const [voiceReplyModelId, setVoiceReplyModelId] = useState(
    initialSettings.voiceReplyModelId
  );
  const [voiceReplyVoice, setVoiceReplyVoice] = useState(
    initialSettings.voiceReplyVoice
  );
  const [voiceReplyPercent, setVoiceReplyPercent] = useState(
    initialSettings.voiceReplyPercent
  );
  const [voiceInputMaxSeconds, setVoiceInputMaxSeconds] = useState(
    initialSettings.voiceInputMaxSeconds
  );
  const [voiceInputMaxMegabytes, setVoiceInputMaxMegabytes] = useState(
    toMegabytes(initialSettings.voiceInputMaxBytes)
  );
  const [voiceReplyMaxChars, setVoiceReplyMaxChars] = useState(
    initialSettings.voiceReplyMaxChars
  );
  const [voiceReplyMaxWords, setVoiceReplyMaxWords] = useState(
    initialSettings.voiceReplyMaxWords
  );
  const [webSearchProvider, setWebSearchProvider] = useState(
    initialSettings.webSearchProvider
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastVisionModelId = useRef(
    initialSettings.visionModelId !== "disabled"
      ? initialSettings.visionModelId
      : firstEnabledOptionId(initialOptions.visionModels)
  );
  const lastVoiceInputModelId = useRef(
    initialSettings.voiceInputModelId !== "disabled"
      ? initialSettings.voiceInputModelId
      : firstEnabledOptionId(initialOptions.voiceInputModels)
  );
  const lastVoiceReplyModelId = useRef(
    initialSettings.voiceReplyModelId !== "disabled"
      ? initialSettings.voiceReplyModelId
      : firstEnabledOptionId(initialOptions.voiceReplyModels)
  );

  function applySettings(nextSettings: ModelSettingsView) {
    setSettings(nextSettings);
    setTextModelId(nextSettings.textModelId);
    setVisionModelId(nextSettings.visionModelId);
    setVoiceInputModelId(nextSettings.voiceInputModelId);
    setVoiceReplyModelId(nextSettings.voiceReplyModelId);
    setVoiceReplyVoice(nextSettings.voiceReplyVoice);
    setVoiceReplyPercent(nextSettings.voiceReplyPercent);
    setVoiceInputMaxSeconds(nextSettings.voiceInputMaxSeconds);
    setVoiceInputMaxMegabytes(
      toMegabytes(nextSettings.voiceInputMaxBytes)
    );
    setVoiceReplyMaxChars(nextSettings.voiceReplyMaxChars);
    setVoiceReplyMaxWords(nextSettings.voiceReplyMaxWords);
    setWebSearchProvider(nextSettings.webSearchProvider);

    if (nextSettings.visionModelId !== "disabled") {
      lastVisionModelId.current = nextSettings.visionModelId;
    }
    if (nextSettings.voiceInputModelId !== "disabled") {
      lastVoiceInputModelId.current = nextSettings.voiceInputModelId;
    }
    if (nextSettings.voiceReplyModelId !== "disabled") {
      lastVoiceReplyModelId.current = nextSettings.voiceReplyModelId;
    }
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/model-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textModelId,
          visionModelId,
          voiceInputModelId,
          voiceReplyModelId,
          voiceReplyVoice,
          voiceReplyPercent,
          voiceInputMaxSeconds,
          voiceInputMaxBytes: Math.round(
            voiceInputMaxMegabytes * BYTES_PER_MEGABYTE
          ),
          voiceReplyMaxChars,
          voiceReplyMaxWords,
          webSearchProvider,
        }),
      });

      const data = (await response.json()) as {
        settings?: ModelSettingsView;
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal menyimpan pengaturan model.");
        return;
      }

      if (data.settings) {
        applySettings(data.settings);
      }

      setSuccess("Pengaturan model disimpan.");
    } catch {
      setError("Gagal menyimpan pengaturan model.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const voiceInputMaxBytes = Math.round(
    voiceInputMaxMegabytes * BYTES_PER_MEGABYTE
  );
  const hasChanges =
    textModelId !== settings.textModelId ||
    visionModelId !== settings.visionModelId ||
    voiceInputModelId !== settings.voiceInputModelId ||
    voiceReplyModelId !== settings.voiceReplyModelId ||
    voiceReplyVoice !== settings.voiceReplyVoice ||
    voiceReplyPercent !== settings.voiceReplyPercent ||
    voiceInputMaxSeconds !== settings.voiceInputMaxSeconds ||
    voiceInputMaxBytes !== settings.voiceInputMaxBytes ||
    voiceReplyMaxChars !== settings.voiceReplyMaxChars ||
    voiceReplyMaxWords !== settings.voiceReplyMaxWords ||
    webSearchProvider !== settings.webSearchProvider;

  const visionEnabled = visionModelId !== "disabled";
  const voiceInputEnabled = voiceInputModelId !== "disabled";
  const voiceReplyEnabled = voiceReplyModelId !== "disabled";

  const enabledVisionModels = initialOptions.visionModels.filter(
    (option) => option.id !== "disabled"
  );

  function handleVisionToggle(enabled: boolean) {
    if (enabled) {
      setVisionModelId(lastVisionModelId.current);
      return;
    }

    if (visionModelId !== "disabled") {
      lastVisionModelId.current = visionModelId;
    }
    setVisionModelId("disabled");
  }

  function handleVoiceInputToggle(enabled: boolean) {
    if (enabled) {
      setVoiceInputModelId(lastVoiceInputModelId.current);
      return;
    }

    if (voiceInputModelId !== "disabled") {
      lastVoiceInputModelId.current = voiceInputModelId;
    }
    setVoiceInputModelId("disabled");
  }

  function handleVoiceReplyToggle(enabled: boolean) {
    if (enabled) {
      setVoiceReplyModelId(lastVoiceReplyModelId.current);
      return;
    }

    if (voiceReplyModelId !== "disabled") {
      lastVoiceReplyModelId.current = voiceReplyModelId;
    }
    setVoiceReplyModelId("disabled");
  }

  function handleVisionModelChange(value: string) {
    lastVisionModelId.current = value;
    setVisionModelId(value);
  }

  function handleVoiceInputModelChange(value: string) {
    lastVoiceInputModelId.current = value;
    setVoiceInputModelId(value);
  }

  function handleVoiceReplyModelChange(value: string) {
    lastVoiceReplyModelId.current = value;
    setVoiceReplyModelId(value);
  }

  return (
    <div className="divide-border surface-panel divide-y overflow-hidden rounded-lg border">
      <ModelSettingsRow
        title="Model Teks"
        description="Model utama untuk chat web, WhatsApp, dan otomatisasi."
        htmlFor="text-model"
        control={
          <Select value={textModelId} onValueChange={setTextModelId}>
            <SelectTrigger id="text-model" className={selectTriggerClassName}>
              <SelectValue placeholder="Pilih model" />
            </SelectTrigger>
            <SelectContent>
              {initialOptions.textModels.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ModelSettingsRow
        title="Penyedia pencarian web"
        description="Penyedia untuk pencarian web dan pembacaan halaman di semua chat."
        htmlFor="web-search-provider"
        control={
          <Select
            value={webSearchProvider}
            onValueChange={setWebSearchProvider}
          >
            <SelectTrigger
              id="web-search-provider"
              className={selectTriggerClassName}
            >
              <SelectValue placeholder="Pilih penyedia" />
            </SelectTrigger>
            <SelectContent>
              {initialOptions.webSearchProviders.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ModelSettingsRow
        title="Model Vision"
        description="Dipakai saat user mengirim gambar atau file visual lewat WhatsApp."
        htmlFor="vision-enabled"
        control={
          <ModelSettingsSwitch
            id="vision-enabled"
            checked={visionEnabled}
            onCheckedChange={handleVisionToggle}
          />
        }
      />

      {visionEnabled ? (
        <ModelSettingsRow
          title="Pilihan Model Vision"
          description="Model yang dipakai saat vision aktif."
          htmlFor="vision-model"
          control={
            <Select
              value={visionModelId}
              onValueChange={handleVisionModelChange}
            >
              <SelectTrigger id="vision-model" className={selectTriggerClassName}>
                <SelectValue placeholder="Pilih model" />
              </SelectTrigger>
              <SelectContent>
                {enabledVisionModels.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      ) : null}

      <ModelSettingsSection title="Voice" />

      <ModelSettingsRow
        title="Input Voice"
        description="Transkripsi pesan suara di chat web dan kanal utama WhatsApp."
        htmlFor="voice-input-enabled"
        control={
          <ModelSettingsSwitch
            id="voice-input-enabled"
            checked={voiceInputEnabled}
            onCheckedChange={handleVoiceInputToggle}
          />
        }
      />

      {voiceInputEnabled ? (
        <>
          <ModelSettingsRow
            title="Model Transkripsi"
            description="Model yang memproses audio menjadi teks."
            htmlFor="voice-input-model"
            control={
              <Select
                value={voiceInputModelId}
                onValueChange={handleVoiceInputModelChange}
              >
                <SelectTrigger
                  id="voice-input-model"
                  className={selectTriggerClassName}
                >
                  <SelectValue placeholder="Pilih model" />
                </SelectTrigger>
                <SelectContent>
                  {initialOptions.voiceInputModels
                    .filter((option) => option.id !== "disabled")
                    .map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            }
          />

          <ModelSettingsRow
            title="Durasi Maksimal"
            description="Batas panjang rekaman suara dalam detik."
            htmlFor="voice-input-max-seconds"
            control={
              <Input
                id="voice-input-max-seconds"
                type="number"
                min={10}
                max={600}
                className="w-[7rem] text-right"
                value={voiceInputMaxSeconds}
                onChange={(event) =>
                  setVoiceInputMaxSeconds(Number(event.target.value))
                }
              />
            }
          />

          <ModelSettingsRow
            title="Ukuran Maksimal"
            description="Batas ukuran file audio dalam megabyte."
            htmlFor="voice-input-max-megabytes"
            control={
              <Input
                id="voice-input-max-megabytes"
                type="number"
                min={1}
                max={47}
                step={1}
                className="w-[7rem] text-right"
                value={voiceInputMaxMegabytes}
                onChange={(event) =>
                  setVoiceInputMaxMegabytes(Number(event.target.value))
                }
              />
            }
          />
        </>
      ) : null}

      <ModelSettingsRow
        title="Balasan Voice"
        description="Agent membalas dengan audio TTS sesuai peluang yang diatur."
        htmlFor="voice-reply-enabled"
        control={
          <ModelSettingsSwitch
            id="voice-reply-enabled"
            checked={voiceReplyEnabled}
            onCheckedChange={handleVoiceReplyToggle}
          />
        }
      />

      {voiceReplyEnabled ? (
        <>
          <ModelSettingsRow
            title="Model TTS"
            description="Model yang menghasilkan balasan suara."
            htmlFor="voice-reply-model"
            control={
              <Select
                value={voiceReplyModelId}
                onValueChange={handleVoiceReplyModelChange}
              >
                <SelectTrigger
                  id="voice-reply-model"
                  className={selectTriggerClassName}
                >
                  <SelectValue placeholder="Pilih model" />
                </SelectTrigger>
                <SelectContent>
                  {initialOptions.voiceReplyModels
                    .filter((option) => option.id !== "disabled")
                    .map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            }
          />

          <ModelSettingsRow
            title="Voice TTS"
            description="Nama suara yang dipakai untuk output audio."
            htmlFor="voice-reply-voice"
            control={
              <Input
                id="voice-reply-voice"
                value={voiceReplyVoice}
                maxLength={64}
                className="w-[11rem]"
                onChange={(event) => setVoiceReplyVoice(event.target.value)}
              />
            }
          />

          <ModelSettingsRow
            title="Peluang Balasan Voice"
            description="Persentase balasan yang dikirim sebagai audio."
            htmlFor="voice-reply-percent"
            control={
              <Input
                id="voice-reply-percent"
                type="number"
                min={0}
                max={100}
                className="w-[7rem] text-right"
                value={voiceReplyPercent}
                onChange={(event) =>
                  setVoiceReplyPercent(Number(event.target.value))
                }
              />
            }
          />

          <ModelSettingsRow
            title="Maksimal Karakter"
            description="Batas panjang teks sebelum balasan dipaksa ke teks."
            htmlFor="voice-reply-max-chars"
            control={
              <Input
                id="voice-reply-max-chars"
                type="number"
                min={80}
                max={4000}
                className="w-[7rem] text-right"
                value={voiceReplyMaxChars}
                onChange={(event) =>
                  setVoiceReplyMaxChars(Number(event.target.value))
                }
              />
            }
          />

          <ModelSettingsRow
            title="Maksimal Kata"
            description="Batas jumlah kata untuk balasan voice."
            htmlFor="voice-reply-max-words"
            control={
              <Input
                id="voice-reply-max-words"
                type="number"
                min={10}
                max={500}
                className="w-[7rem] text-right"
                value={voiceReplyMaxWords}
                onChange={(event) =>
                  setVoiceReplyMaxWords(Number(event.target.value))
                }
              />
            }
          />

          <div className="px-4 py-3">
            <p className="text-muted-foreground leading-snug">
              Berita, balasan panjang, tautan, hasil tindakan, dan konten
              berisiko tetap dikirim sebagai teks meskipun balasan voice aktif.
            </p>
          </div>
        </>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
          (error || success) && "gap-4"
        )}
      >
        <div className="min-h-6 flex-1">
          {error ? (
            <p className="text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-emerald-600 dark:text-emerald-400" role="status">
              {success}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSubmitting || !hasChanges}
        >
          {isSubmitting ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </div>
  );
}
