"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleIcon } from "@/components/icons/google-icon";
import { IntegrationCardHeader } from "@/components/settings/integration-card-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GoogleIntegrationStatus } from "@/lib/integrations/google-repository";

interface GoogleIntegrationCardProps {
  initialStatus: GoogleIntegrationStatus;
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  denied: "Koneksi Google dibatalkan.",
  invalid_state: "Sesi OAuth tidak valid. Coba hubungkan lagi.",
  unauthorized: "Login dulu sebelum menghubungkan Google.",
  error: "Gagal menghubungkan Google. Coba lagi.",
};

export function GoogleIntegrationCard({
  initialStatus,
}: GoogleIntegrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const googleParam = searchParams.get("google");

    if (!googleParam) {
      return;
    }

    if (googleParam === "connected") {
      setError(null);
      router.replace("/dashboard/settings");
      router.refresh();
      return;
    }

    setError(GOOGLE_ERROR_MESSAGES[googleParam] ?? "Gagal menghubungkan Google.");
    router.replace("/dashboard/settings");
  }, [searchParams, router]);

  async function handleDisconnect() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/google", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Gagal memutuskan Google.");
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
          icon={<GoogleIcon className="size-6" />}
          title="Google"
          description={status.email ?? ""}
          statusTone="connected"
          statusLabel="Terhubung"
        />
        <CardContent className="space-y-3 p-4">
          <p className="text-muted-foreground text-xs">
            Calendar, Gmail, dan Drive (baca + upload) siap dipakai di tool chat.
            {status.lastVerifiedAt
              ? ` Terakhir diverifikasi: ${new Date(status.lastVerifiedAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Jakarta",
                })}`
              : null}
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
        icon={<GoogleIcon className="size-6" />}
        title="Google"
        description="Calendar, Gmail, dan Drive dari chat."
        statusTone="muted"
        statusLabel="Belum terhubung"
      />
      <CardContent className="space-y-3 p-4">
        <p className="text-muted-foreground text-xs">
          Hubungkan satu akun Google untuk jadwal, email, dan file Drive.
        </p>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
        <Button asChild disabled={isSubmitting}>
          <a href="/api/integrations/google/authorize">Hubungkan Google</a>
        </Button>
      </CardContent>
    </Card>
  );
}
