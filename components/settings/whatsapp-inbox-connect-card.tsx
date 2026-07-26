"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { IntegrationRow } from "@/components/settings/integration-row";
import { Button } from "@/components/ui/button";
import type { WhatsAppUserInstanceView } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

interface WhatsAppInboxConnectCardProps {
  initialInstance: WhatsAppUserInstanceView;
}

export function WhatsAppInboxConnectCard({
  initialInstance,
}: WhatsAppInboxConnectCardProps) {
  const router = useRouter();
  const [instance, setInstance] = useState(initialInstance);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const connected = instance.status === "connected";
  const pairing = instance.status === "pairing";

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/whatsapp/inbox/qrcode", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        connected?: boolean;
        instance?: WhatsAppUserInstanceView;
        qr?: { base64: string };
      };

      if (!response.ok) {
        return;
      }

      if (data.instance) {
        setInstance(data.instance);
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
    if (instance.status !== "pairing") {
      return;
    }

    void pollStatus();
    const interval = window.setInterval(() => {
      void pollStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [instance.status, pollStatus]);

  async function handleConnect() {
    setError(null);
    setIsSubmitting(true);
    setQrBase64(null);

    try {
      const response = await fetch("/api/integrations/whatsapp/inbox/connect", {
        method: "POST",
      });
      const data = (await response.json()) as WhatsAppUserInstanceView & {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memulai koneksi WhatsApp.");
        return;
      }

      setInstance(data);
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
      const response = await fetch("/api/integrations/whatsapp/inbox/connect", {
        method: "DELETE",
      });
      const data = (await response.json()) as WhatsAppUserInstanceView & {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal memutus koneksi.");
        return;
      }

      setInstance(data);
      setQrBase64(null);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const description = connected
    ? (instance.phoneE164 ?? "Ringkasan chat read-only")
    : "Ringkasan chat dan grup (read-only)";

  return (
    <IntegrationRow
      icon={<WhatsAppIcon className="size-6" />}
      title="WhatsApp pribadi"
      description={description}
      statusTone={connected ? "connected" : pairing ? "warning" : "muted"}
      statusLabel={
        connected
          ? "Terhubung"
          : pairing
            ? "Menunggu scan"
            : "Belum terhubung"
      }
      actions={
        connected ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/whatsapp-inbox">Buka ringkasan</Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Memutuskan..." : "Putuskan"}
            </Button>
          </div>
        ) : !pairing ? (
          <Button onClick={handleConnect} disabled={isSubmitting}>
            {isSubmitting ? "Menghubungkan..." : "Hubungkan"}
          </Button>
        ) : null
      }
    >
      {pairing && qrBase64 ? (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <img
            src={qrBase64}
            alt="QR WhatsApp"
            className="size-40 rounded-lg border"
          />
          <p className="text-muted-foreground">
            Scan QR dengan WhatsApp di ponsel kamu.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-destructive">{error}</p> : null}
    </IntegrationRow>
  );
}
