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

export function ModelSettingsCard({
  initialSettings,
  initialOptions,
}: ModelSettingsCardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [textModelId, setTextModelId] = useState(initialSettings.textModelId);
  const [visionModelId, setVisionModelId] = useState(
    initialSettings.visionModelId
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/model-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textModelId, visionModelId }),
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
        setSettings(data.settings);
        setTextModelId(data.settings.textModelId);
        setVisionModelId(data.settings.visionModelId);
      }

      setSuccess("Pengaturan model disimpan.");
    } catch {
      setError("Gagal menyimpan pengaturan model.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasChanges =
    textModelId !== settings.textModelId ||
    visionModelId !== settings.visionModelId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model OpenRouter</CardTitle>
        <CardDescription>
          Pengaturan global untuk chat web, WhatsApp, dan otomatisasi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="text-model">Text Model (Wajib)</Label>
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
          <Label htmlFor="vision-model">Vision Model</Label>
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
