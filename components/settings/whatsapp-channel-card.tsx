"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WhatsAppChannelConfigView } from "@/lib/integrations/whatsapp-channel-repository";

interface WhatsAppChannelCardProps {
  initialConfig: WhatsAppChannelConfigView;
}

export function WhatsAppChannelCard({
  initialConfig,
}: WhatsAppChannelCardProps) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/whatsapp-channel/qrcode", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        connected?: boolean;
        config?: WhatsAppChannelConfigView;
        qr?: { base64: string };
        message?: string;
      };

      if (!response.ok) {
        return;
      }

      if (data.config) {
        setConfig(data.config);
      }

      if (data.connected) {
        setQrBase64(null);
        router.refresh();
        return;
      }

      if (data.qr?.base64) {
        setQrBase64(data.qr.base64);
      }
    } catch {
      // Ignore transient polling errors.
    }
  }, [router]);

  useEffect(() => {
    if (config.status !== "pairing") {
      return;
    }

    void pollStatus();
    const interval = window.setInterval(() => {
      void pollStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [config.status, pollStatus]);

  async function handleConnect() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/whatsapp-channel", {
        method: "POST",
      });
      const data = (await response.json()) as WhatsAppChannelConfigView & {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memulai pairing.");
        return;
      }

      setConfig(data);
      await pollStatus();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/whatsapp-channel", {
        method: "DELETE",
      });
      const data = (await response.json()) as WhatsAppChannelConfigView & {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memutuskan channel.");
        return;
      }

      setConfig(data);
      setQrBase64(null);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (config.status === "connected") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel WhatsApp</CardTitle>
          <CardDescription>
            Nomor channel global untuk semua user. User mendaftarkan HP mereka di
            Integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium text-green-600">Terhubung</span>
          </p>
          {config.channelPhoneE164 ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Nomor channel: </span>
              <span className="font-medium">{config.channelPhoneE164}</span>
            </p>
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memutuskan..." : "Putuskan"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel WhatsApp</CardTitle>
        <CardDescription>
          Scan QR dengan WhatsApp nomor channel. Hanya admin yang perlu scan
          sekali.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.status === "pairing" && qrBase64 ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrBase64}
              alt="QR code WhatsApp channel"
              className="size-56 rounded-lg border"
            />
            <p className="text-muted-foreground text-center text-sm">
              Buka WhatsApp → Perangkat tertaut → Tautkan perangkat → scan QR
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Channel belum terhubung. Klik tombol di bawah untuk mulai pairing.
          </p>
        )}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
      <CardFooter>
        <Button onClick={handleConnect} disabled={isSubmitting}>
          {isSubmitting
            ? "Menghubungkan..."
            : config.status === "pairing"
              ? "Refresh QR"
              : "Hubungkan channel"}
        </Button>
      </CardFooter>
    </Card>
  );
}
