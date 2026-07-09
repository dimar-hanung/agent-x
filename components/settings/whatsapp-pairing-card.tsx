"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { IntegrationCardHeader } from "@/components/settings/integration-card-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { WhatsAppUserPairingStatus } from "@/lib/integrations/whatsapp-channel-repository";

interface WhatsAppPairingCardProps {
  initialStatus: WhatsAppUserPairingStatus;
}

export function WhatsAppPairingCard({
  initialStatus,
}: WhatsAppPairingCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const channelReady = status.channel.status === "connected";
  const paired = Boolean(status.userPhoneE164);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/whatsapp/phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = (await response.json()) as {
        userPhoneE164?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal menyimpan nomor HP.");
        return;
      }

      setStatus((prev) => ({
        ...prev,
        userPhoneE164: data.userPhoneE164 ?? prev.userPhoneE164,
      }));
      setPhone("");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/whatsapp/phone", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Gagal menghapus pairing.");
        return;
      }

      setStatus((prev) => ({ ...prev, userPhoneE164: null }));
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusTone = paired ? "connected" : channelReady ? "muted" : "warning";
  const statusLabel = paired
    ? "Terhubung"
    : channelReady
      ? "Belum terhubung"
      : "Channel nonaktif";

  return (
    <Card className="gap-0 py-0">
      <IntegrationCardHeader
        icon={<WhatsAppIcon className="size-6" />}
        title="WhatsApp"
        description={
          status.userPhoneE164 ?? "Chat ke kanal utama lewat WhatsApp."
        }
        statusTone={statusTone}
        statusLabel={statusLabel}
      />
      <CardContent className="space-y-3 p-4">
        {channelReady && status.channel.channelPhoneE164 ? (
          <div className="bg-muted space-y-1 rounded-lg p-3 text-xs">
            <p className="text-muted-foreground">Nomor channel</p>
            <p className="font-medium">{status.channel.channelPhoneE164}</p>
            <p className="text-muted-foreground">
              Kirim pesan dari HP terdaftar ke nomor ini.
            </p>
          </div>
        ) : null}

        {!channelReady ? (
          <p className="text-muted-foreground text-xs">
            Channel WhatsApp belum aktif. Hubungi admin untuk mengaktifkan.
          </p>
        ) : null}

        {paired ? (
          <>
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemove}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menghapus..." : "Hapus pairing"}
            </Button>
          </>
        ) : channelReady ? (
          <form onSubmit={handleSave}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="whatsapp-phone">Nomor HP</FieldLabel>
                <Input
                  id="whatsapp-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="08123456789"
                  required
                  disabled={!channelReady}
                  autoComplete="tel"
                />
                <FieldDescription>
                  Gunakan nomor yang sama dengan WhatsApp di HP kamu.
                </FieldDescription>
              </Field>
              {error ? (
                <p className="text-destructive text-xs">{error}</p>
              ) : null}
              <Button type="submit" disabled={isSubmitting || !channelReady}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </FieldGroup>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
