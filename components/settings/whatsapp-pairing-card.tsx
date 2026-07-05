"use client";

import { useRouter } from "next/navigation";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp</CardTitle>
        <CardDescription>
          Daftarkan nomor HP kamu untuk chat ke kanal utama lewat WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {channelReady && status.channel.channelPhoneE164 ? (
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">Nomor channel:</p>
            <p className="font-medium">{status.channel.channelPhoneE164}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              Kirim pesan ke nomor ini dari HP yang terdaftar.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Channel WhatsApp belum aktif. Hubungi admin.
          </p>
        )}

        {status.userPhoneE164 ? (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">HP terdaftar: </span>
              <span className="font-medium">{status.userPhoneE164}</span>
            </p>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <FieldGroup>
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
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <Button type="submit" disabled={isSubmitting || !channelReady}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
      {status.userPhoneE164 ? (
        <CardFooter>
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menghapus..." : "Hapus pairing"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
