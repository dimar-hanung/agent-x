"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MicrosoftIcon } from "@/components/icons/microsoft-icon";
import { DualProviderConnectWarningDialog } from "@/components/settings/dual-provider-connect-warning-dialog";
import { IntegrationCardHeader } from "@/components/settings/integration-card-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MicrosoftIntegrationStatus } from "@/lib/integrations/microsoft-repository";

interface MicrosoftIntegrationCardProps {
  initialStatus: MicrosoftIntegrationStatus;
  otherProviderConnected: boolean;
}

const MICROSOFT_ERROR_MESSAGES: Record<string, string> = {
  denied: "Koneksi Microsoft dibatalkan.",
  invalid_state: "Sesi OAuth tidak valid. Coba hubungkan lagi.",
  unauthorized: "Login dulu sebelum menghubungkan Microsoft.",
  error: "Gagal menghubungkan Microsoft. Coba lagi.",
};

const AUTHORIZE_URL = "/api/integrations/microsoft/authorize";

export function MicrosoftIntegrationCard({
  initialStatus,
  otherProviderConnected,
}: MicrosoftIntegrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    const microsoftParam = searchParams.get("microsoft");

    if (!microsoftParam) {
      return;
    }

    if (microsoftParam === "connected") {
      setError(null);
      router.replace("/dashboard/settings");
      router.refresh();
      return;
    }

    setError(
      MICROSOFT_ERROR_MESSAGES[microsoftParam] ??
        "Gagal menghubungkan Microsoft."
    );
    router.replace("/dashboard/settings");
  }, [searchParams, router]);

  async function handleDisconnect() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/integrations/microsoft", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Gagal memutuskan Microsoft.");
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

  function handleConnectClick() {
    if (otherProviderConnected) {
      setWarningOpen(true);
      return;
    }

    window.location.href = AUTHORIZE_URL;
  }

  if (status.connected) {
    return (
      <Card className="gap-0 py-0">
        <IntegrationCardHeader
          icon={<MicrosoftIcon className="size-6" />}
          title="Microsoft"
          description={status.email ?? ""}
          statusTone="connected"
          statusLabel="Terhubung"
        />
        <CardContent className="space-y-3 p-4">
          <p className="text-muted-foreground text-xs">
            Outlook, Calendar, dan OneDrive (baca + upload) siap dipakai di tool
            chat.
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
    <>
      <Card className="gap-0 py-0">
        <IntegrationCardHeader
          icon={<MicrosoftIcon className="size-6" />}
          title="Microsoft"
          description="Outlook, Calendar, dan OneDrive dari chat."
          statusTone="muted"
          statusLabel="Belum terhubung"
        />
        <CardContent className="space-y-3 p-4">
          <p className="text-muted-foreground text-xs">
            Hubungkan satu akun Microsoft untuk email, jadwal, dan file
            OneDrive.
          </p>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <Button onClick={handleConnectClick} disabled={isSubmitting}>
            Hubungkan Microsoft
          </Button>
        </CardContent>
      </Card>

      <DualProviderConnectWarningDialog
        open={warningOpen}
        onOpenChange={setWarningOpen}
        connectingProvider="microsoft"
        activeProvider="google"
        authorizeUrl={AUTHORIZE_URL}
      />
    </>
  );
}
