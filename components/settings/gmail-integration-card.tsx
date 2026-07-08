"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GmailIcon } from "@/components/icons/gmail-icon";
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
import type { GmailIntegrationStatus } from "@/lib/integrations/gmail-repository";

interface GmailIntegrationCardProps {
  initialStatus: GmailIntegrationStatus;
}

export function GmailIntegrationCard({
  initialStatus,
}: GmailIntegrationCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, appPassword }),
      });

      const data = (await response.json()) as GmailIntegrationStatus & {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Gagal menghubungkan Gmail.");
        return;
      }

      setStatus(data);
      setEmail("");
      setAppPassword("");
      router.refresh();
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
      const response = await fetch("/api/integrations/gmail", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Gagal memutuskan Gmail.");
        return;
      }

      setStatus({ connected: false });
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status.connected) {
    return (
      <Card className="gap-0 py-0">
        <IntegrationCardHeader
          icon={<GmailIcon className="size-6" />}
          title="Gmail"
          description={status.email ?? ""}
          statusTone="connected"
          statusLabel="Terhubung"
        />
        <CardContent className="space-y-3 p-4">
          <p className="text-muted-foreground text-xs">
            {status.lastVerifiedAt
              ? `Terakhir diverifikasi: ${new Date(status.lastVerifiedAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : "Siap dipakai di tool chat."}
          </p>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDisconnect}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memutuskan..." : "Putuskan"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <IntegrationCardHeader
        icon={<GmailIcon className="size-6" />}
        title="Gmail"
        description="Kirim & baca email dari chat."
        statusTone="muted"
        statusLabel="Belum terhubung"
      />
      <CardContent className="p-4">
        <form onSubmit={handleConnect}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="gmail-email">Email Gmail</FieldLabel>
              <Input
                id="gmail-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@gmail.com"
                required
                autoComplete="email"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="gmail-app-password">App password</FieldLabel>
              <Input
                id="gmail-app-password"
                type="password"
                value={appPassword}
                onChange={(event) => setAppPassword(event.target.value)}
                placeholder="16-karakter app password"
                required
                autoComplete="off"
              />
              <FieldDescription>
                Buat app password di Google Account → Security → 2-Step
                Verification → App passwords.{" "}
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Pelajari
                </a>
              </FieldDescription>
            </Field>
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menghubungkan..." : "Hubungkan Gmail"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
