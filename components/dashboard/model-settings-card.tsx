"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ModelSettingsCardProps {
  initialSettings: ModelSettingsView;
  initialOptions: ModelSettingsOptionsView;
}

const BYTES_PER_MEGABYTE = 1024 * 1024;

function toMegabytes(bytes: number): number {
  return bytes / BYTES_PER_MEGABYTE;
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    voiceReplyMaxWords !== settings.voiceReplyMaxWords;
  const voiceInputEnabled = voiceInputModelId !== "disabled";
  const voiceReplyEnabled = voiceReplyModelId !== "disabled";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model OpenRouter</CardTitle>
        <CardDescription>
          Pengaturan global untuk chat web, WhatsApp, dan otomatisasi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="text-model">Model Teks (Wajib)</Label>
          <Select value={textModelId} onValueChange={setTextModelId}>
            <SelectTrigger id="text-model" className="w-full">
              <SelectValue placeholder="Pilih model teks" />
            </SelectTrigger>
            <SelectContent>
              {initialOptions.textModels.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vision-model">Model Vision</Label>
          <Select value={visionModelId} onValueChange={setVisionModelId}>
            <SelectTrigger id="vision-model" className="w-full">
              <SelectValue placeholder="Pilih model vision" />
            </SelectTrigger>
            <SelectContent>
              {initialOptions.visionModels.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Dipakai saat user mengirim gambar atau file visual lewat WhatsApp.
            Pilih Disabled jika belum siap.
          </p>
        </div>

        <div className="space-y-5 border-t pt-6">
          <div>
            <h3 className="font-medium">Voice WhatsApp</h3>
            <p className="text-muted-foreground text-xs">
              Atur transkripsi pesan suara dan balasan suara pada kanal utama.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-input-model">Model Input Voice</Label>
            <Select
              value={voiceInputModelId}
              onValueChange={setVoiceInputModelId}
            >
              <SelectTrigger id="voice-input-model" className="w-full">
                <SelectValue placeholder="Pilih model transkripsi" />
              </SelectTrigger>
              <SelectContent>
                {initialOptions.voiceInputModels.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Pilih Disabled untuk menolak pesan suara tanpa menjalankan
              transkripsi.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voice-input-max-seconds">
                Durasi Maksimal (detik)
              </Label>
              <Input
                id="voice-input-max-seconds"
                type="number"
                min={10}
                max={600}
                value={voiceInputMaxSeconds}
                disabled={!voiceInputEnabled}
                onChange={(event) =>
                  setVoiceInputMaxSeconds(Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-input-max-megabytes">
                Ukuran Maksimal (MB)
              </Label>
              <Input
                id="voice-input-max-megabytes"
                type="number"
                min={1}
                max={47}
                step={1}
                value={voiceInputMaxMegabytes}
                disabled={!voiceInputEnabled}
                onChange={(event) =>
                  setVoiceInputMaxMegabytes(Number(event.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-reply-model">Model Balasan Voice</Label>
            <Select
              value={voiceReplyModelId}
              onValueChange={setVoiceReplyModelId}
            >
              <SelectTrigger id="voice-reply-model" className="w-full">
                <SelectValue placeholder="Pilih model TTS" />
              </SelectTrigger>
              <SelectContent>
                {initialOptions.voiceReplyModels.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Pilih Disabled agar agent selalu membalas dengan teks.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voice-reply-voice">Voice TTS</Label>
              <Input
                id="voice-reply-voice"
                value={voiceReplyVoice}
                maxLength={64}
                disabled={!voiceReplyEnabled}
                onChange={(event) => setVoiceReplyVoice(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-reply-percent">
                Peluang Balasan Voice (%)
              </Label>
              <Input
                id="voice-reply-percent"
                type="number"
                min={0}
                max={100}
                value={voiceReplyPercent}
                disabled={!voiceReplyEnabled}
                onChange={(event) =>
                  setVoiceReplyPercent(Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-reply-max-chars">
                Maksimal Karakter
              </Label>
              <Input
                id="voice-reply-max-chars"
                type="number"
                min={80}
                max={4000}
                value={voiceReplyMaxChars}
                disabled={!voiceReplyEnabled}
                onChange={(event) =>
                  setVoiceReplyMaxChars(Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-reply-max-words">
                Maksimal Kata
              </Label>
              <Input
                id="voice-reply-max-words"
                type="number"
                min={10}
                max={500}
                value={voiceReplyMaxWords}
                disabled={!voiceReplyEnabled}
                onChange={(event) =>
                  setVoiceReplyMaxWords(Number(event.target.value))
                }
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Berita, balasan panjang, tautan, hasil tindakan, dan konten berisiko
            tetap dikirim sebagai teks meskipun balasan voice aktif.
          </p>
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-sm text-emerald-600" role="status">
            {success}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSubmitting || !hasChanges}
        >
          {isSubmitting ? "Menyimpan…" : "Simpan"}
        </Button>
      </CardFooter>
    </Card>
  );
}
