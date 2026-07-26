"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { IntegrationCardHeader } from "@/components/settings/integration-card-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <Card>
      <IntegrationCardHeader
        icon={<WhatsAppIcon className="size-5" />}
        title="WhatsApp pribadi"
        description="Hubungkan akun WhatsApp kamu (read-only) untuk ringkasan chat dan grup."
        statusTone={connected ? "connected" : instance.status === "pairing" ? "warning" : "muted"}
        statusLabel={
          connected
            ? "Terhubung"
            : instance.status === "pairing"
              ? "Menunggu scan"
              : "Belum terhubung"
        }
      />
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          AgentX hanya membaca pesan untuk membuat ringkasan eksekutif. Tidak
          ada balasan otomatis dari akun pribadi kamu.
        </p>

        {connected ? (
          <div className="space-y-3">
            <p className="text-sm">
              Terhubung
              {instance.phoneE164 ? ` · ${instance.phoneE164}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/whatsapp-inbox">Buka ringkasan</Link>
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isSubmitting}
              >
                Putuskan
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {instance.status === "pairing" && qrBase64 ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={qrBase64}
                  alt="QR WhatsApp"
                  className="size-48 rounded-lg border"
                />
                <p className="text-muted-foreground text-center text-sm">
                  Scan QR dengan WhatsApp di ponsel kamu.
                </p>
              </div>
            ) : (
              <Button onClick={handleConnect} disabled={isSubmitting}>
                Hubungkan WhatsApp
              </Button>
            )}
          </div>
        )}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
