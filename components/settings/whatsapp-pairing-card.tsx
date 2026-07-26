"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { IntegrationRow } from "@/components/settings/integration-row";
import { Button } from "@/components/ui/button";
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

  const description = paired
    ? (status.userPhoneE164 ?? "Chat ke kanal utama")
    : channelReady
      ? "Chat ke kanal utama lewat WhatsApp"
      : "Channel belum aktif";

  return (
    <IntegrationRow
      icon={<WhatsAppIcon className="size-6" />}
      title="WhatsApp channel"
      description={description}
      statusTone={statusTone}
      statusLabel={statusLabel}
      actions={
        paired ? (
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menghapus..." : "Hapus pairing"}
          </Button>
        ) : null
      }
    >
      {channelReady && status.channel.channelPhoneE164 ? (
        <p className="text-muted-foreground">
          Kirim pesan dari HP terdaftar ke{" "}
          <span className="text-foreground font-medium">
            {status.channel.channelPhoneE164}
          </span>
          .
        </p>
      ) : null}

      {!channelReady ? (
        <p className="text-muted-foreground">
          Channel WhatsApp belum aktif. Hubungi admin untuk mengaktifkan.
        </p>
      ) : null}

      {!paired && channelReady ? (
        <form onSubmit={handleSave} className="max-w-sm">
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="whatsapp-phone">Nomor HP</FieldLabel>
              <div className="flex gap-2">
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
                <Button
                  type="submit"
                  disabled={isSubmitting || !channelReady}
                  className="shrink-0"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
              <FieldDescription>
                Gunakan nomor yang sama dengan WhatsApp di HP kamu.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      ) : null}

      {error ? <p className="text-destructive">{error}</p> : null}
    </IntegrationRow>
  );
}
